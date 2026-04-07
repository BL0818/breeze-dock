import React, { useMemo, useState, useEffect } from 'react';
import {
  FileText,
  Star,
  Trash2,
  Folder,
  Tag as TagIcon,
  Pin,
  Archive,
  Edit3,
  PictureInPicture,
} from 'lucide-react';
import { useNoteStore } from '../../stores/useNoteStore';
import { useGroupStore } from '../../stores/useGroupStore';
import { useTagStore } from '../../stores/useTagStore';
import { useUIStore } from '../../stores/useUIStore';
import { useFloatingWindow } from '../../hooks/useFloatingWindow';
import type { Note } from '../../types';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import NoteFilterToolbar from './NoteFilterToolbar';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// ============================================================
// NoteListView - 中间栏笔记列表视图
// 支持分组筛选、排序、拖拽、右键菜单
// ============================================================

interface NoteListViewProps {
  className?: string;
}

const NoteListView: React.FC<NoteListViewProps> = ({ className }) => {
  const notes = useNoteStore((s) => s.notes);
  const currentNoteId = useNoteStore((s) => s.currentNoteId);
  const filter = useNoteStore((s) => s.filter);
  const setFilter = useNoteStore((s) => s.setFilter);
  const selectNote = useNoteStore((s) => s.selectNote);
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const pinNote = useNoteStore((s) => s.pinNote);
  const starNote = useNoteStore((s) => s.starNote);
  const archiveNote = useNoteStore((s) => s.archiveNote);
  const trashNote = useNoteStore((s) => s.trashNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const restoreNote = useNoteStore((s) => s.restoreNote);
  const moveNoteToGroup = useNoteStore((s) => s.moveNoteToGroup);
  const reorderNotes = useNoteStore((s) => s.reorderNotes);

  const groups = useGroupStore((s) => s.groups);
  const selectedGroupId = useGroupStore((s) => s.selectedGroupId);

  const tags = useTagStore((s) => s.tags);
  const selectedTagId = useTagStore((s) => s.selectedTagId);

  const currentView = useUIStore((s) => s.currentView);

  // 悬浮窗 hook
  const { createFloatingWindow } = useFloatingWindow();

  // 本地状态
  const [searchQuery] = useState('');

  // 拖拽状态
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 删除确认对话框
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; noteId: string | null; noteTitle: string }>({
    open: false,
    noteId: null,
    noteTitle: '',
  });

  // 移动分组对话框
  const [moveDialog, setMoveDialog] = useState<{ open: boolean; noteId: string | null }>({
    open: false,
    noteId: null,
  });

  // 同步筛选条件到 store
  useEffect(() => {
    const newFilter: typeof filter = {
      view: currentView,
      groupId: undefined, // 显式清除
      tagId: undefined,   // 显式清除
    };

    if (currentView === 'group' && selectedGroupId) {
      newFilter.groupId = selectedGroupId;
    }

    if (currentView === 'tag' && selectedTagId) {
      newFilter.tagId = selectedTagId;
    }

    if (searchQuery) {
      newFilter.query = searchQuery;
    }

    setFilter(newFilter);
    loadNotes(newFilter);
  }, [currentView, selectedGroupId, selectedTagId, searchQuery]);

  // 获取当前视图标题和图标
  const viewInfo = useMemo(() => {
    switch (currentView) {
      case 'starred':
        return { icon: Star, title: '星标笔记', color: 'text-yellow-500' };
      case 'trash':
        return { icon: Trash2, title: '回收站', color: 'text-red-500' };
      case 'archived':
        return { icon: Archive, title: '归档笔记', color: 'text-gray-500' };
      case 'group':
        const group = groups.find((g) => g.id === selectedGroupId);
        return { icon: Folder, title: group?.name || '分组笔记', color: 'text-blue-500' };
      case 'tag':
        const tag = tags.find((t) => t.id === selectedTagId);
        return { icon: TagIcon, title: tag?.name || '标签笔记', color: 'text-purple-500' };
      default:
        return { icon: FileText, title: '全部笔记', color: 'text-blue-500' };
    }
  }, [currentView, selectedGroupId, selectedTagId, groups, tags]);

  // 筛选后的笔记列表
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // 根据视图筛选
    switch (currentView) {
      case 'starred':
        result = result.filter((n) => n.isStarred && !n.isTrashed);
        break;
      case 'trash':
        result = result.filter((n) => n.isTrashed);
        break;
      case 'archived':
        result = result.filter((n) => n.isArchived && !n.isTrashed);
        break;
      case 'group':
        if (selectedGroupId) {
          result = result.filter((n) => n.groupId === selectedGroupId);
        }
        break;
      case 'tag':
        if (selectedTagId) {
          result = result.filter((n) => n.tags?.includes(selectedTagId));
        }
        break;
      default:
        result = result.filter((n) => !n.isTrashed && !n.isArchived);
    }

    // 分组筛选
    if (filter.groupId !== undefined && currentView !== 'group') {
      result = result.filter((n) => n.groupId === filter.groupId);
    }

    // 标签筛选
    if (filter.tagId && currentView !== 'tag') {
      result = result.filter((n) => n.tags?.includes(filter.tagId!));
    }

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query)
      );
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
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [notes, currentView, selectedGroupId, selectedTagId, searchQuery, filter.sortBy, filter.sortOrder]);

  // 处理笔记选择
  const handleSelectNote = (note: Note) => {
    selectNote(note.id);
  };

  // 格式化时间
  const formatTime = (dateStr: string): string => {
    const d = dayjs(dateStr);
    const now = dayjs();
    if (d.isSame(now, 'day')) return d.format('HH:mm');
    if (d.isSame(now.subtract(1, 'day'), 'day')) return '昨天';
    if (d.isSame(now, 'year')) return d.format('M月D日');
    return d.format('YYYY年M月D日');
  };

  // 拖拽处理
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    setDraggedId(noteId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/note-id', noteId);
    const emptyImg = new Image();
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId === null) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const dropIndex = e.clientY < midY ? index : index + 1;
    setDragOverIndex(dropIndex);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId || dragOverIndex === null) {
      setDraggedId(null);
      setDragOverIndex(null);
      return;
    }

    const currentIndex = filteredNotes.findIndex((n) => n.id === draggedId);
    if (currentIndex === -1) {
      setDraggedId(null);
      setDragOverIndex(null);
      return;
    }

    // 计算新的排序值
    let newSortOrder = 0;
    if (dragOverIndex === 0) {
      newSortOrder = (filteredNotes[0]?.sortOrder ?? 0) - 1;
    } else if (dragOverIndex >= filteredNotes.length) {
      newSortOrder = (filteredNotes[filteredNotes.length - 1]?.sortOrder ?? 0) + 1;
    } else {
      const prevOrder = filteredNotes[dragOverIndex - 1]?.sortOrder ?? 0;
      const nextOrder = filteredNotes[dragOverIndex]?.sortOrder ?? 0;
      newSortOrder = (prevOrder + nextOrder) / 2;
    }

    reorderNotes([[draggedId, Math.round(newSortOrder)]]);

    setDraggedId(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverIndex(null);
  };

  // 删除处理
  const handleDelete = (note: Note) => {
    if (currentView === 'trash') {
      // 永久删除
      setDeleteDialog({ open: true, noteId: note.id, noteTitle: note.title });
    } else {
      // 移到回收站
      trashNote(note.id);
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.noteId) {
      deleteNote(deleteDialog.noteId);
      setDeleteDialog({ open: false, noteId: null, noteTitle: '' });
    }
  };

  // 移动分组
  const handleMoveToGroup = (groupId: string | null) => {
    if (moveDialog.noteId) {
      moveNoteToGroup(moveDialog.noteId, groupId);
      setMoveDialog({ open: false, noteId: null });
    }
  };

  const Icon = viewInfo.icon;

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-[#141414]', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-5 h-5 self-center', viewInfo.color)} />
          <div className="relative inline-flex items-center">
            <h2 className="text-[15px] font-medium text-gray-900 dark:text-gray-100">
              {viewInfo.title}
            </h2>
            <Badge
              className="absolute -top-1 -right-4 text-[10px] h-4 min-w-[16px] px-1 flex items-center justify-center bg-[var(--color-primary)] text-white border-0"
            >
              {filteredNotes.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* 优化的筛选工具栏 */}
      <NoteFilterToolbar />

      {/* 笔记列表 */}
      <div
        className="flex-1 overflow-y-auto px-2 py-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Icon className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-[13px]">暂无笔记</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredNotes.map((note, index) => (
              <div
                key={note.id}
                className="relative"
                draggable
                onDragStart={(e) => handleDragStart(e, note.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                {/* 拖拽放置指示器 */}
                {dragOverIndex === index && draggedId !== note.id && (
                  <div className="absolute -top-[2px] left-0 right-0 h-[2px] bg-[var(--color-primary)] rounded-full z-10" />
                )}

                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div
                      onClick={() => handleSelectNote(note)}
                      className={cn(
                        'group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-150',
                        currentNoteId === note.id
                          ? 'bg-[var(--color-primary-subtle)]'
                          : 'hover:bg-gray-100 dark:hover:bg-[#1A1A1A]',
                        draggedId === note.id && 'opacity-40'
                      )}
                    >
                      {/* 图标 */}
                      <div className="flex-shrink-0 mt-0.5">
                        <FileText
                          className={cn(
                            'w-4 h-4',
                            currentNoteId === note.id ? 'text-[var(--color-primary)]' : 'text-gray-400'
                          )}
                        />
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        {/* 标题行 */}
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              'text-[13px] font-medium truncate flex-1',
                              currentNoteId === note.id
                                ? 'text-[var(--color-primary)]'
                                : 'text-gray-900 dark:text-gray-100'
                            )}
                          >
                            {note.title || '无标题'}
                          </span>
                          <div className="flex items-center gap-1">
                            {note.isPinned && (
                              <Pin className="w-3 h-3 text-gray-400" />
                            )}
                            {note.isStarred && (
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                        </div>

                        {/* 内容摘要 */}
                        <p className="text-[12px] text-gray-500 truncate leading-relaxed mb-1">
                          {note.content
                            ? note.content.substring(0, 80).replace(/[#*_[\]]/g, '')
                            : '空白笔记'}
                        </p>

                        {/* 底部信息 */}
                        <div className="flex items-center gap-2">
                          {/* 分组标签 */}
                          {note.groupId && (
                            <span className="text-[11px] text-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-1.5 py-0.5 rounded">
                              {groups.find((g) => g.id === note.groupId)?.name || '分组'}
                            </span>
                          )}

                          {/* 笔记标签 */}
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              {note.tags.slice(0, 2).map((tagId) => {
                                const tag = tags.find((t) => t.id === tagId);
                                return tag ? (
                                  <span
                                    key={tagId}
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                    title={tag.name}
                                  />
                                ) : null;
                              })}
                              {note.tags.length > 2 && (
                                <span className="text-[11px] text-gray-400">+{note.tags.length - 2}</span>
                              )}
                            </div>
                          )}

                          {/* 时间 */}
                          <span className="text-[11px] text-gray-400 ml-auto">
                            {formatTime(note.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>

                  <ContextMenuContent className="w-40">
                    <ContextMenuItem onClick={() => handleSelectNote(note)}>
                      <Edit3 className="w-3.5 h-3.5 mr-2" />
                      编辑
                    </ContextMenuItem>

                    <ContextMenuItem onClick={() => createFloatingWindow({ note })}>
                      <PictureInPicture className="w-3.5 h-3.5 mr-2" />
                      悬浮窗打开
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem onClick={() => pinNote(note.id, !note.isPinned)}>
                      <Pin className="w-3.5 h-3.5 mr-2" />
                      {note.isPinned ? '取消置顶' : '置顶'}
                    </ContextMenuItem>

                    <ContextMenuItem onClick={() => starNote(note.id, !note.isStarred)}>
                      <Star className="w-3.5 h-3.5 mr-2" />
                      {note.isStarred ? '取消星标' : '星标'}
                    </ContextMenuItem>

                    {currentView !== 'archived' && (
                      <ContextMenuItem onClick={() => archiveNote(note.id, !note.isArchived)}>
                        <Archive className="w-3.5 h-3.5 mr-2" />
                        {note.isArchived ? '取消归档' : '归档'}
                      </ContextMenuItem>
                    )}

                    <ContextMenuSeparator />

                    <ContextMenuItem onClick={() => setMoveDialog({ open: true, noteId: note.id })}>
                      <Folder className="w-3.5 h-3.5 mr-2" />
                      移动分组
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    {currentView === 'trash' ? (
                      <>
                        <ContextMenuItem onClick={() => restoreNote(note.id)}>
                          恢复
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => handleDelete(note)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          永久删除
                        </ContextMenuItem>
                      </>
                    ) : (
                      <ContextMenuItem
                        onClick={() => handleDelete(note)}
                        className="text-red-500 focus:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        删除
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            ))}

            {/* 列表末尾拖拽指示器 */}
            {filteredNotes.length > 0 && dragOverIndex === filteredNotes.length && (
              <div className="relative h-0">
                <div className="absolute -top-[2px] left-0 right-0 h-[2px] bg-[var(--color-primary)] rounded-full z-10" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, noteId: null, noteTitle: '' })}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-base">永久删除笔记</DialogTitle>
            <DialogDescription className="text-xs">
              确定要永久删除笔记 "{deleteDialog.noteTitle}" 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteDialog({ open: false, noteId: null, noteTitle: '' })}>
              取消
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移动分组对话框 */}
      <Dialog open={moveDialog.open} onOpenChange={(open) => !open && setMoveDialog({ open: false, noteId: null })}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-base">移动分组</DialogTitle>
            <DialogDescription className="text-xs">选择要移动到的分组</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            <div className="space-y-1">
              <button
                onClick={() => handleMoveToGroup(null)}
                className="w-full text-left px-3 py-2 rounded-md text-[13px] hover:bg-gray-100 dark:hover:bg-[#1A1A1A]"
              >
                无分组
              </button>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleMoveToGroup(group.id)}
                  className="w-full text-left px-3 py-2 rounded-md text-[13px] hover:bg-gray-100 dark:hover:bg-[#1A1A1A]"
                >
                  {group.name}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMoveDialog({ open: false, noteId: null })}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NoteListView;
