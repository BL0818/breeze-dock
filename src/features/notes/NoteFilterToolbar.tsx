import React, { useEffect, useState, useMemo } from 'react';
import { Search, Folder, Tag, ArrowUpDown, FileText, Clock, Check, Pencil, Trash2 } from 'lucide-react';
import { useNoteStore } from '../../stores/useNoteStore';
import { useGroupStore } from '../../stores/useGroupStore';
import { useTagStore } from '../../stores/useTagStore';
import { useUIStore } from '../../stores/useUIStore';
import { searchNotes, highlightText } from '../../utils/search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

// ============================================================
// NoteFilterToolbar - 专业级笔记筛选工具栏
// 左右两端对齐布局，Command 面板，Tooltip 提示
// ============================================================

export interface NoteFilterToolbarProps {
  className?: string;
}

type SortOption = 'updatedAt' | 'createdAt' | 'title';
type SortOrder = 'asc' | 'desc';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'updatedAt', label: '更新时间' },
  { value: 'createdAt', label: '创建时间' },
  { value: 'title', label: '标题' },
];

const NoteFilterToolbar: React.FC<NoteFilterToolbarProps> = ({ className }) => {
  // Store 状态
  const currentView = useUIStore((s) => s.currentView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);

  const groups = useGroupStore((s) => s.groups);
  const selectGroup = useGroupStore((s) => s.selectGroup);
  const updateGroup = useGroupStore((s) => s.updateGroup);
  const deleteGroup = useGroupStore((s) => s.deleteGroup);

  const tags = useTagStore((s) => s.tags);
  const selectTag = useTagStore((s) => s.selectTag);
  const updateTag = useTagStore((s) => s.updateTag);
  const deleteTag = useTagStore((s) => s.deleteTag);

  const setFilter = useNoteStore((s) => s.setFilter);
  const loadNotes = useNoteStore((s) => s.loadNotes);

  // 本地状态
  const [sortBy, setSortBy] = React.useState<SortOption>('updatedAt');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');
  const [groupFilter, setGroupFilter] = React.useState<string>('all');
  const [tagFilter, setTagFilter] = React.useState<string>('all');

  // Command 面板状态
  const [groupCommandOpen, setGroupCommandOpen] = useState(false);
  const [tagCommandOpen, setTagCommandOpen] = useState(false);
  const [searchCommandOpen, setSearchCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState<'group' | 'tag' | null>(null);
  const [editItem, setEditItem] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState('');

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'group' | 'tag' | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null);

  // 获取笔记数据
  const notes = useNoteStore((s) => s.notes);
  const selectNote = useNoteStore((s) => s.selectNote);

  // 同步筛选条件到 store
  React.useEffect(() => {
    // 构建新的筛选条件，确保包含当前的 view
    const newFilter: Parameters<typeof setFilter>[0] = {
      view: currentView,
      groupId: undefined, // 显式清除旧的分组筛选
      tagId: undefined,   // 显式清除旧的标签筛选
    };

    if (groupFilter !== 'all') {
      newFilter.groupId = groupFilter === 'ungrouped' ? null : groupFilter;
    }

    if (tagFilter !== 'all') {
      newFilter.tagId = tagFilter;
    }

    newFilter.sortBy = sortBy;
    newFilter.sortOrder = sortOrder;

    setFilter(newFilter);
    loadNotes(newFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupFilter, tagFilter, sortBy, sortOrder, currentView]);

  // 当视图切换时，重置本地筛选状态
  React.useEffect(() => {
    if (currentView === 'all') {
      setGroupFilter('all');
      setTagFilter('all');
    } else if (currentView === 'group') {
      setTagFilter('all');
    } else if (currentView === 'tag') {
      setGroupFilter('all');
    }
  }, [currentView]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K 唤起搜索 Command 面板
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey) {
        e.preventDefault();
        setSearchCommandOpen(true);
      }
      // Cmd/Ctrl + Shift + G 唤起分组筛选 Command
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        setGroupCommandOpen(true);
      }
      // Cmd/Ctrl + Shift + T 唤起标签筛选 Command
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setTagCommandOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 搜索结果
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchNotes(notes.filter((n) => !n.isTrashed), searchQuery);
  }, [searchQuery, notes]);

  // 处理笔记选择
  const handleSelectNote = (noteId: string) => {
    selectNote(noteId);
    setCurrentView('all');
    setSearchCommandOpen(false);
    setSearchQuery('');
  };

  // 处理分组选择
  const handleGroupSelect = (groupId: string) => {
    setGroupFilter(groupId);
    setGroupCommandOpen(false);
    if (groupId !== 'all' && groupId !== 'ungrouped') {
      selectGroup(groupId);
    }
  };

  // 处理标签选择
  const handleTagSelect = (tagId: string) => {
    setTagFilter(tagId);
    setTagCommandOpen(false);
    if (tagId !== 'all') {
      selectTag(tagId);
    }
  };

  // 打开编辑对话框
  const openEditDialog = (type: 'group' | 'tag', item: { id: string; name: string }) => {
    setEditType(type);
    setEditItem(item);
    setEditName(item.name);
    setEditDialogOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editItem || !editType || !editName.trim()) return;

    if (editType === 'group') {
      await updateGroup(editItem.id, { name: editName.trim() });
    } else {
      await updateTag(editItem.id, { name: editName.trim() });
    }
    setEditDialogOpen(false);
    setEditItem(null);
    setEditName('');
  };

  // 打开删除确认对话框
  const openDeleteDialog = (type: 'group' | 'tag', item: { id: string; name: string }) => {
    setDeleteType(type);
    setDeleteItem(item);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteItem || !deleteType) return;

    if (deleteType === 'group') {
      await deleteGroup(deleteItem.id);
      if (groupFilter === deleteItem.id) {
        setGroupFilter('all');
      }
    } else {
      await deleteTag(deleteItem.id);
      if (tagFilter === deleteItem.id) {
        setTagFilter('all');
      }
    }
    setDeleteDialogOpen(false);
    setDeleteItem(null);
  };

  // 切换排序方向
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // 获取当前选中的分组/标签名称
  const selectedGroupName = React.useMemo(() => {
    if (groupFilter === 'all') return '全部分组';
    if (groupFilter === 'ungrouped') return '无分组';
    return groups.find((g) => g.id === groupFilter)?.name || '全部分组';
  }, [groupFilter, groups]);

  const selectedTagName = React.useMemo(() => {
    if (tagFilter === 'all') return '全部标签';
    return tags.find((t) => t.id === tagFilter)?.name || '全部标签';
  }, [tagFilter, tags]);

  // 使用这些值避免警告（在 Tooltip 的 title 中使用）
  const formatTime = (dateStr: string): string => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 判断是否在分组/标签视图（隐藏对应筛选器）
  const isGroupView = currentView === 'group';
  const isTagView = currentView === 'tag';

  return (
    <TooltipProvider delayDuration={100}>
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-2',
          'border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]',
          'bg-white dark:bg-[#141414]',
          className
        )}
      >
        {/* 左侧：图标按钮组 */}
        <div className="flex items-center gap-1">
          {/* 搜索按钮 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSearchCommandOpen(true)}
                className={cn(
                  'h-8 w-8 rounded-lg',
                  'text-gray-500 dark:text-gray-400',
                  'hover:bg-gray-100 dark:hover:bg-[#1A1A1A]',
                  'hover:text-gray-900 dark:hover:text-gray-100',
                  'transition-all duration-150 ease-out',
                  'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20'
                )}
              >
                <Search className="h-[18px] w-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div className="flex items-center gap-2">
                <span>搜索笔记 ({selectedGroupName} · {selectedTagName})</span>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px]">Ctrl+K</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* 搜索 Command 面板 */}
          <CommandDialog
            open={searchCommandOpen}
            onOpenChange={setSearchCommandOpen}
            title="搜索笔记"
            description="输入关键词搜索笔记标题和内容"
            className="sm:max-w-[520px]"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="搜索笔记标题或内容..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-[400px]">
                {!searchQuery.trim() ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <Search className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p>输入关键词开始搜索</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <CommandEmpty className="py-8 text-center text-sm">
                    <Search className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p>未找到匹配的笔记</p>
                  </CommandEmpty>
                ) : (
                  <CommandGroup heading={`找到 ${searchResults.length} 条结果`}>
                    {searchResults.map((note) => (
                      <CommandItem
                        key={note.id}
                        onSelect={() => handleSelectNote(note.id)}
                      >
                        <FileText className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0 ml-3">
                          <p
                            className="text-sm font-medium truncate"
                            dangerouslySetInnerHTML={{
                              __html: highlightText(note.title || '无标题', searchQuery)
                            }}
                          />
                          <p
                            className="text-xs text-muted-foreground mt-0.5 line-clamp-1"
                            dangerouslySetInnerHTML={{
                              __html: highlightText(
                                note.content?.substring(0, 80).replace(/[#*_[\]]/g, '') || '空白笔记',
                                searchQuery
                              )
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(note.updatedAt)}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </CommandDialog>

          {/* 分组筛选按钮 - 仅在非分组视图显示 */}
          {!isGroupView && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setGroupCommandOpen(true)}
                    className={cn(
                      'h-8 w-8 rounded-lg',
                      'text-gray-500 dark:text-gray-400',
                      'hover:bg-gray-100 dark:hover:bg-[#1A1A1A]',
                      'hover:text-gray-900 dark:hover:text-gray-100',
                      'transition-all duration-150 ease-out',
                      'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20',
                      groupFilter !== 'all' && 'text-[var(--color-primary)] bg-[var(--color-primary-subtle),0.08)]'
                    )}
                  >
                    <Folder className="h-[18px] w-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="flex items-center gap-2">
                    <span>筛选分组</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px]">Ctrl+Shift+G</kbd>
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* 分组筛选 Command 面板 */}
              <CommandDialog
                open={groupCommandOpen}
                onOpenChange={setGroupCommandOpen}
                title="选择分组"
                description="筛选特定分组的笔记"
                className="sm:max-w-[400px]"
              >
                <Command>
                  <CommandInput placeholder="搜索分组..." />
                  <CommandList className="max-h-[320px]">
                    <CommandEmpty>未找到分组</CommandEmpty>
                    <CommandGroup heading="快速选择">
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <CommandItem
                            onSelect={() => handleGroupSelect('all')}
                            className="cursor-pointer"
                          >
                            <Folder className="mr-2 h-4 w-4" />
                            <span className="flex-1">全部分组</span>
                            {groupFilter === 'all' && (
                              <Check className="ml-auto h-4 w-4 text-[var(--color-primary)] flex-shrink-0" />
                            )}
                          </CommandItem>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-32">
                          <ContextMenuItem disabled>
                            系统选项，不可编辑
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <CommandItem
                            onSelect={() => handleGroupSelect('ungrouped')}
                            className="cursor-pointer"
                          >
                            <Folder className="mr-2 h-4 w-4" />
                            <span className="flex-1">无分组</span>
                            {groupFilter === 'ungrouped' && (
                              <Check className="ml-auto h-4 w-4 text-[var(--color-primary)] flex-shrink-0" />
                            )}
                          </CommandItem>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-32">
                          <ContextMenuItem disabled>
                            系统选项，不可编辑
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </CommandGroup>
                    {groups.length > 0 && (
                      <>
                        <CommandSeparator />
                        <CommandGroup heading="我的分组">
                          {groups.map((group) => (
                            <ContextMenu key={group.id}>
                              <ContextMenuTrigger asChild>
                                <CommandItem
                                  onSelect={() => handleGroupSelect(group.id)}
                                  className="group cursor-pointer"
                                >
                                  <span
                                    className="mr-2 h-2 w-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: 'var(--color-primary)' }}
                                  />
                                  <span className="truncate flex-1">{group.name}</span>
                                  {groupFilter === group.id && (
                                    <Check className="ml-auto h-4 w-4 text-[var(--color-primary)] flex-shrink-0" />
                                  )}
                                </CommandItem>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-32">
                                <ContextMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog('group', { id: group.id, name: group.name });
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  重命名
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteDialog('group', { id: group.id, name: group.name });
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  删除
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </CommandDialog>
            </>
          )}

          {/* 标签筛选按钮 - 仅在非标签视图且存在标签时显示 */}
          {!isTagView && tags.length > 0 && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setTagCommandOpen(true)}
                    className={cn(
                      'h-8 w-8 rounded-lg',
                      'text-gray-500 dark:text-gray-400',
                      'hover:bg-gray-100 dark:hover:bg-[#1A1A1A]',
                      'hover:text-gray-900 dark:hover:text-gray-100',
                      'transition-all duration-150 ease-out',
                      'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20',
                      tagFilter !== 'all' && 'text-[var(--color-primary)] bg-[var(--color-primary-subtle),0.08)]'
                    )}
                  >
                    <Tag className="h-[18px] w-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="flex items-center gap-2">
                    <span>筛选标签</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px]">Ctrl+Shift+T</kbd>
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* 标签筛选 Command 面板 */}
              <CommandDialog
                open={tagCommandOpen}
                onOpenChange={setTagCommandOpen}
                title="选择标签"
                description="筛选特定标签的笔记"
                className="sm:max-w-[400px]"
              >
                <Command>
                  <CommandInput placeholder="搜索标签..." />
                  <CommandList className="max-h-[320px]">
                    <CommandEmpty>未找到标签</CommandEmpty>
                    <CommandGroup heading="快速选择">
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <CommandItem
                            onSelect={() => handleTagSelect('all')}
                            className="cursor-pointer"
                          >
                            <Tag className="mr-2 h-4 w-4" />
                            <span className="flex-1">全部标签</span>
                            {tagFilter === 'all' && (
                              <Check className="ml-auto h-4 w-4 text-[var(--color-primary)] flex-shrink-0" />
                            )}
                          </CommandItem>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-32">
                          <ContextMenuItem disabled>
                            系统选项，不可编辑
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </CommandGroup>
                    {tags.length > 0 && (
                      <>
                        <CommandSeparator />
                        <CommandGroup heading="我的标签">
                          {tags.map((tag) => (
                            <ContextMenu key={tag.id}>
                              <ContextMenuTrigger asChild>
                                <CommandItem
                                  onSelect={() => handleTagSelect(tag.id)}
                                  className="group cursor-pointer"
                                >
                                  <span
                                    className="mr-2 h-2 w-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span className="truncate flex-1">{tag.name}</span>
                                  {tagFilter === tag.id && (
                                    <Check className="ml-auto h-4 w-4 text-[var(--color-primary)] flex-shrink-0" />
                                  )}
                                </CommandItem>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-32">
                                <ContextMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog('tag', { id: tag.id, name: tag.name });
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  重命名
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteDialog('tag', { id: tag.id, name: tag.name });
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  删除
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </CommandDialog>
            </>
          )}
        </div>

        {/* 右侧：排序控件 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* 排序方向切换按钮 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={toggleSortOrder}
                className={cn(
                  'h-6 w-6 rounded-md',
                  'text-gray-400 dark:text-gray-500',
                  'hover:bg-gray-100 dark:hover:bg-[#1A1A1A]',
                  'hover:text-gray-600 dark:hover:text-gray-300',
                  'transition-all duration-150'
                )}
              >
                <ArrowUpDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    sortOrder === 'asc' && 'rotate-180'
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {sortOrder === 'asc' ? '升序排列' : '降序排列'}
            </TooltipContent>
          </Tooltip>

          {/* 排序字段选择 */}
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger
              className={cn(
                'h-7 min-w-[88px] w-auto px-2.5 py-1',
                'text-[12px] font-medium',
                'bg-transparent border-0',
                'text-gray-600 dark:text-gray-400',
                'hover:bg-gray-100 dark:hover:bg-[#1A1A1A]',
                'focus:ring-0 focus:ring-offset-0',
                'rounded-md',
                'transition-colors duration-150'
              )}
            >
              <SelectValue placeholder="排序" />
            </SelectTrigger>
            <SelectContent
              align="end"
              className="min-w-[100px] bg-white dark:bg-[#1A1A1A] border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]"
            >
              {sortOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'text-[12px] py-1.5 px-2.5',
                    'focus:bg-[var(--color-primary-subtle),0.08)] focus:text-[var(--color-primary)]',
                    'cursor-pointer'
                  )}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 编辑对话框 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>{editType === 'group' ? '重命名分组' : '重命名标签'}</DialogTitle>
              <DialogDescription>
                输入新的名称
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={editType === 'group' ? '分组名称' : '标签名称'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit();
                  }
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="bg-[var(--color-primary)] hover:bg-[#306AFF]"
              >
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="text-destructive">确认删除</DialogTitle>
              <DialogDescription>
                确定要删除{deleteType === 'group' ? '分组' : '标签'}"{deleteItem?.name}"吗？此操作不可撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default NoteFilterToolbar;
