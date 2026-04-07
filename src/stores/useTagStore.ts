import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Tag, TagId, NoteId, Note } from '../types';
import { getRandomTagColor } from '../types';
import { toast } from 'sonner';

interface TagState {
  tags: Tag[];
  selectedTagId: TagId | null;
  isLoading: boolean;
}

interface TagActions {
  // 数据加载
  loadTags: () => Promise<void>;

  // CRUD 操作
  createTag: (name: string, color?: string) => Promise<Tag | null>;
  updateTag: (id: TagId, updates: Partial<Omit<Tag, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTag: (id: TagId) => Promise<void>;

  // 选择状态
  selectTag: (id: TagId | null) => void;

  // 查询方法
  getTagById: (id: TagId) => Tag | undefined;
  getNotesByTag: (tagId: TagId) => Promise<Note[]>;

  // 笔记标签关联
  addNoteTag: (noteId: NoteId, tagId: TagId) => Promise<void>;
  removeNoteTag: (noteId: NoteId, tagId: TagId) => Promise<void>;

  // 工具方法
  refreshTagNoteCount: (tagId: TagId) => Promise<void>;
}

type TagStore = TagState & TagActions;

export const useTagStore = create<TagStore>((set, get) => ({
  // ---- 初始状态 ----
  tags: [],
  selectedTagId: null,
  isLoading: false,

  // ---- 数据加载 ----
  loadTags: async () => {
    set({ isLoading: true });
    try {
      const tags = await invoke<Tag[]>('get_tags');
      set({ tags, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error(`加载标签失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- CRUD 操作 ----
  createTag: async (name: string, color?: string) => {
    const finalColor = color || getRandomTagColor();
    try {
      const tag = await invoke<Tag>('create_tag', {
        name: name.trim(),
        color: finalColor
      });
      set((state) => ({
        tags: [...state.tags, tag]
      }));
      toast.success(`标签 "${name}" 创建成功`);
      return tag;
    } catch (error) {
      toast.error(`创建标签失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return null;
    }
  },

  updateTag: async (id: TagId, updates) => {
    try {
      const updated = await invoke<Tag>('update_tag', {
        id,
        ...updates
      });
      set((state) => ({
        tags: state.tags.map((t) => (t.id === id ? updated : t)),
      }));
      toast.success('标签更新成功');
    } catch (error) {
      toast.error(`更新标签失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  deleteTag: async (id: TagId) => {
    try {
      await invoke('delete_tag', { id });
      set((state) => ({
        tags: state.tags.filter((t) => t.id !== id),
        selectedTagId: state.selectedTagId === id ? null : state.selectedTagId,
      }));
      toast.success('标签已删除');
    } catch (error) {
      toast.error(`删除标签失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- 选择状态 ----
  selectTag: (id: TagId | null) => {
    set({ selectedTagId: id });
  },

  // ---- 查询方法 ----
  getTagById: (id: TagId) => {
    return get().tags.find((t) => t.id === id);
  },

  getNotesByTag: async (tagId: TagId) => {
    try {
      const notes = await invoke<Note[]>('get_notes_by_tag', { tagId });
      return notes;
    } catch (error) {
      toast.error(`获取标签笔记失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return [];
    }
  },

  // ---- 笔记标签关联 ----
  addNoteTag: async (noteId: NoteId, tagId: TagId) => {
    try {
      await invoke('add_note_tag', { noteId, tagId });
      // 更新标签的笔记计数
      set((state) => ({
        tags: state.tags.map((t) =>
          t.id === tagId ? { ...t, noteCount: t.noteCount + 1 } : t
        ),
      }));
    } catch (error) {
      toast.error(`添加标签失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  removeNoteTag: async (noteId: NoteId, tagId: TagId) => {
    try {
      await invoke('remove_note_tag', { noteId, tagId });
      // 更新标签的笔记计数
      set((state) => ({
        tags: state.tags.map((t) =>
          t.id === tagId ? { ...t, noteCount: Math.max(0, t.noteCount - 1) } : t
        ),
      }));
    } catch (error) {
      toast.error(`移除标签失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- 工具方法 ----
  refreshTagNoteCount: async (tagId: TagId) => {
    try {
      const notes = await get().getNotesByTag(tagId);
      set((state) => ({
        tags: state.tags.map((t) =>
          t.id === tagId ? { ...t, noteCount: notes.length } : t
        ),
      }));
    } catch (error) {
      console.error('刷新标签笔记计数失败:', error);
    }
  },
}));
