import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Note, NoteId, NoteHistory, NoteTemplate, NoteFilter, GroupId, TagId } from '../types';
import { toast } from 'sonner';

interface NoteState {
  notes: Note[];
  currentNoteId: NoteId | null;
  filter: NoteFilter;
  histories: NoteHistory[];
  loading: boolean;
}

interface NoteActions {
  // 数据加载
  loadNotes: (filter?: Partial<NoteFilter>) => Promise<void>;

  // CRUD 操作
  createNote: (template?: NoteTemplate, groupId?: GroupId | null) => Promise<Note | null>;
  updateNote: (id: NoteId, updates: Partial<Pick<Note, 'title' | 'content' | 'groupId' | 'template'>>) => Promise<void>;
  deleteNote: (id: NoteId) => Promise<void>;
  trashNote: (id: NoteId) => Promise<void>;
  restoreNote: (id: NoteId) => Promise<void>;
  emptyTrash: () => Promise<void>;

  // 状态切换
  pinNote: (id: NoteId, pinned: boolean) => Promise<void>;
  starNote: (id: NoteId, starred: boolean) => Promise<void>;
  archiveNote: (id: NoteId, archived: boolean) => Promise<void>;

  // 排序
  reorderNotes: (orders: Array<[NoteId, number]>) => Promise<void>;

  // 搜索
  searchNotes: (keyword: string) => Promise<Note[]>;

  // 历史版本
  loadHistory: (noteId: NoteId) => Promise<void>;
  rollbackNote: (noteId: NoteId, historyId: string) => Promise<Note | null>;

  // 选择状态
  selectNote: (id: NoteId | null) => void;
  setFilter: (filter: Partial<NoteFilter>) => void;

  // 标签关联
  addNoteTag: (noteId: NoteId, tagId: TagId) => Promise<void>;
  removeNoteTag: (noteId: NoteId, tagId: TagId) => Promise<void>;

  // 分组移动
  moveNoteToGroup: (noteId: NoteId, groupId: GroupId | null) => Promise<void>;

  // 查询方法
  getNoteById: (id: NoteId) => Note | undefined;
  getFilteredNotes: () => Note[];
}

type NoteStore = NoteState & NoteActions;

export const useNoteStore = create<NoteStore>((set, get) => ({
  // ---- 初始状态 ----
  notes: [],
  currentNoteId: null,
  filter: { view: 'all' },
  histories: [],
  loading: false,

  // ---- 数据加载 ----
  loadNotes: async (filter) => {
    const nextFilter = { ...get().filter, ...filter };
    set({ loading: true, filter: nextFilter });
    try {
      const args: Record<string, unknown> = {};

      // 视图筛选
      if (nextFilter.view === 'starred') args.isStarred = 1;
      if (nextFilter.view === 'archived') args.isArchived = 1;
      if (nextFilter.view === 'trash') args.isTrashed = 1;
      else args.isTrashed = 0;

      // 分组筛选
      if (nextFilter.groupId !== undefined) {
        args.groupId = nextFilter.groupId;
      }

      // 搜索关键词
      if (nextFilter.query) {
        args.keyword = nextFilter.query;
      }

      // 仅置顶
      if (nextFilter.pinnedOnly) {
        args.isPinned = 1;
      }

      const notes = await invoke<Note[]>('get_notes', args);

      // 如果有标签筛选，在前端过滤
      let filteredNotes = notes;
      if (nextFilter.tagId) {
        filteredNotes = notes.filter((note) =>
          note.tags?.includes(nextFilter.tagId!)
        );
      }

      // 排序
      const sortBy = nextFilter.sortBy || 'updatedAt';
      const sortOrder = nextFilter.sortOrder || 'desc';

      filteredNotes.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'createdAt':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'updatedAt':
            comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'sortOrder':
            comparison = a.sortOrder - b.sortOrder;
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      const currentNoteId = get().currentNoteId;
      // 如果没有选中任何笔记且列表不为空，自动选中第一条
      const newCurrentNoteId = !currentNoteId && filteredNotes.length > 0
        ? filteredNotes[0].id
        : currentNoteId;

      set({
        notes: filteredNotes,
        currentNoteId: newCurrentNoteId,
        loading: false
      });
    } catch (error) {
      set({ loading: false });
      toast.error(`加载笔记失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- CRUD 操作 ----
  createNote: async (template = 'blank', groupId = null) => {
    try {
      const note = await invoke<Note>('create_note', { template, groupId });
      set((s) => ({ notes: [note, ...s.notes], currentNoteId: note.id }));
      toast.success('笔记创建成功');
      return note;
    } catch (error) {
      toast.error(`创建笔记失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return null;
    }
  },

  updateNote: async (id, updates) => {
    // 乐观更新：先更新本地状态，确保受控输入同步响应
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n,
      ),
    }));
    // 异步持久化到后端
    try {
      await invoke('update_note', { id, ...updates });
    } catch (error) {
      toast.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  deleteNote: async (id) => {
    try {
      await invoke('delete_note', { id });
      set((s) => ({
        notes: s.notes.filter((n) => n.id !== id),
        currentNoteId: s.currentNoteId === id ? null : s.currentNoteId,
      }));
      toast.success('笔记已永久删除');
    } catch (error) {
      toast.error(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  trashNote: async (id) => {
    try {
      await invoke('trash_note', { id });
      set((s) => ({
        notes: s.notes.map((n) =>
          n.id === id
            ? { ...n, isTrashed: true, trashedAt: new Date().toISOString() }
            : n,
        ),
        currentNoteId: s.currentNoteId === id ? null : s.currentNoteId,
      }));
      toast.success('笔记已移至回收站');
    } catch (error) {
      toast.error(`移动失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  restoreNote: async (id) => {
    try {
      await invoke('restore_note', { id });
      set((s) => ({
        notes: s.notes.map((n) =>
          n.id === id ? { ...n, isTrashed: false, trashedAt: null } : n,
        ),
      }));
      toast.success('笔记已恢复');
    } catch (error) {
      toast.error(`恢复失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  emptyTrash: async () => {
    try {
      // 删除所有回收站笔记
      const trashed = get().notes.filter((n) => n.isTrashed);
      for (const n of trashed) {
        await invoke('delete_note', { id: n.id });
      }
      set((s) => ({ notes: s.notes.filter((n) => !n.isTrashed) }));
      toast.success('回收站已清空');
    } catch (error) {
      toast.error(`清空失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- 状态切换 ----
  pinNote: async (id, pinned) => {
    try {
      await invoke('pin_note', { id, pinned });
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? { ...n, isPinned: pinned } : n)),
      }));
    } catch (error) {
      toast.error(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  starNote: async (id, starred) => {
    try {
      await invoke('star_note', { id, starred });
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? { ...n, isStarred: starred } : n)),
      }));
    } catch (error) {
      toast.error(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  archiveNote: async (id, archived) => {
    try {
      await invoke('archive_note', { id, archived });
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? { ...n, isArchived: archived } : n)),
      }));
    } catch (error) {
      toast.error(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- 排序 ----
  reorderNotes: async (orders) => {
    try {
      await invoke('reorder_notes', { orders });
      set((s) => {
        const orderMap = new Map(orders);
        return {
          notes: s.notes.map((n) => {
            const newOrder = orderMap.get(n.id);
            return newOrder !== undefined ? { ...n, sortOrder: newOrder } : n;
          }),
        };
      });
    } catch (error) {
      toast.error(`排序失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- 搜索 ----
  searchNotes: async (keyword) => {
    try {
      const results = await invoke<Note[]>('search_notes', { keyword });
      return results;
    } catch (error) {
      toast.error(`搜索失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return [];
    }
  },

  // ---- 历史版本 ----
  loadHistory: async (noteId) => {
    try {
      const histories = await invoke<NoteHistory[]>('get_note_history', { noteId });
      set({ histories });
    } catch (error) {
      toast.error(`加载历史失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  rollbackNote: async (noteId, historyId) => {
    try {
      const note = await invoke<Note>('rollback_note', { noteId, historyId });
      set((s) => ({
        notes: s.notes.map((n) => (n.id === noteId ? note : n)),
      }));
      toast.success('已回滚到指定版本');
      return note;
    } catch (error) {
      toast.error(`回滚失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return null;
    }
  },

  // ---- 选择状态 ----
  selectNote: (id) => {
    set({ currentNoteId: id });
  },

  setFilter: (filter) => {
    set((s) => ({ filter: { ...s.filter, ...filter } }));
  },

  // ---- 标签关联 ----
  addNoteTag: async (noteId: NoteId, tagId: TagId) => {
    try {
      await invoke('add_note_tag', { noteId, tagId });
      set((s) => ({
        notes: s.notes.map((n) =>
          n.id === noteId && !n.tags?.includes(tagId)
            ? { ...n, tags: [...(n.tags || []), tagId] }
            : n
        ),
      }));
    } catch (error) {
      toast.error(`添加标签失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  removeNoteTag: async (noteId: NoteId, tagId: TagId) => {
    try {
      await invoke('remove_note_tag', { noteId, tagId });
      set((s) => ({
        notes: s.notes.map((n) =>
          n.id === noteId
            ? { ...n, tags: (n.tags || []).filter((t) => t !== tagId) }
            : n
        ),
      }));
    } catch (error) {
      toast.error(`移除标签失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- 分组移动 ----
  moveNoteToGroup: async (noteId: NoteId, groupId: GroupId | null) => {
    try {
      await invoke('update_note', { id: noteId, groupId });
      set((s) => ({
        notes: s.notes.map((n) =>
          n.id === noteId ? { ...n, groupId } : n
        ),
      }));
      toast.success('笔记已移动');
    } catch (error) {
      toast.error(`移动失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- 查询方法 ----
  getNoteById: (id: NoteId) => {
    return get().notes.find((n) => n.id === id);
  },

  getFilteredNotes: () => {
    const { notes, filter } = get();
    let result = [...notes];

    // 视图筛选
    switch (filter.view) {
      case 'starred':
        result = result.filter((n) => n.isStarred);
        break;
      case 'archived':
        result = result.filter((n) => n.isArchived && !n.isTrashed);
        break;
      case 'trash':
        result = result.filter((n) => n.isTrashed);
        break;
      default:
        result = result.filter((n) => !n.isTrashed);
    }

    // 分组筛选
    if (filter.groupId !== undefined) {
      result = result.filter((n) => n.groupId === filter.groupId);
    }

    // 标签筛选
    if (filter.tagId) {
      result = result.filter((n) => n.tags?.includes(filter.tagId!));
    }

    // 搜索关键词
    if (filter.query) {
      const query = filter.query.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query)
      );
    }

    // 仅置顶
    if (filter.pinnedOnly) {
      result = result.filter((n) => n.isPinned);
    }

    // 排序
    const sortBy = filter.sortBy || 'updatedAt';
    const sortOrder = filter.sortOrder || 'desc';

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'sortOrder':
          comparison = a.sortOrder - b.sortOrder;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  },
}));
