import { useMemo, useState } from 'react';
import {
  Plus,
  Star,
  Trash2,
  PanelLeft,
  PanelLeftOpen,
  Settings,
  FolderPlus,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
import { useNoteStore } from '../../stores/useNoteStore';
import { useGroupStore } from '../../stores/useGroupStore';
import { useTagStore } from '../../stores/useTagStore';
import { useUIStore } from '../../stores/useUIStore';
import { toast } from 'sonner';
import { useSettingStore } from '../../stores/useSettingStore';

// ============================================================
// BrSidebar - Linear 极简风格侧边栏（固定收起状态）
// 只保留图标，点击展开按钮显示待开发提示
// ============================================================

const BrSidebar: React.FC = () => {
  const notes = useNoteStore((s) => s.notes);
  const createGroup = useGroupStore((s) => s.createGroup);
  const createTag = useTagStore((s) => s.createTag);

  const currentView = useUIStore((s) => s.currentView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);

  const createNote = useNoteStore((s) => s.createNote);

  // 获取主题色
  const primaryColor = useSettingStore((s) => s.settings.colors.primary);

  // 本地状态
  const [createGroupDialog, setCreateGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [createTagDialog, setCreateTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const activeNotes = useMemo(
    () => notes.filter((n) => !n.isTrashed && !n.isArchived),
    [notes],
  );

  const starredNotes = useMemo(
    () => notes.filter((n) => n.isStarred && !n.isTrashed),
    [notes],
  );

  const handleCreate = () => {
    setCurrentView('all');
    createNote('blank');
  };

  const handleExpandClick = () => {
    toast.info('侧边栏展开功能开发中...', {
      duration: 2000,
    });
  };

  const navItems = [
    { id: 'all', icon: PanelLeft, label: '全部笔记', count: activeNotes.length },
    { id: 'starred', icon: Star, label: '星标', count: starredNotes.length },
    { id: 'trash', icon: Trash2, label: '回收站', count: null },
  ];

  // 处理创建分组
  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroup(newGroupName.trim());
      setNewGroupName('');
      setCreateGroupDialog(false);
    }
  };

  // 处理创建标签
  const handleCreateTag = () => {
    if (newTagName.trim()) {
      createTag(newTagName.trim());
      setNewTagName('');
      setCreateTagDialog(false);
    }
  };

  return (
    <div className="w-12 h-full flex flex-col bg-[#FAFAFA] dark:bg-[#141414] border-r border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
      {/* 展开按钮 */}
      <div className="flex items-center justify-center py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleExpandClick}
              className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <span>展开侧边栏</span>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* 新建按钮 */}
      <div className="flex flex-col items-center gap-1 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCreate}
              className="w-8 h-8 rounded-md flex items-center justify-center text-white transition-colors duration-150"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <span>新建笔记</span>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCreateGroupDialog(true)}
              className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <span>新建分组</span>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="h-px bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] mx-2 my-2" />

      {/* 导航图标 */}
      <div className="flex flex-col items-center gap-1 py-2">
        {navItems.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCurrentView(item.id as any)}
                className={`
                  w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150
                  ${currentView === item.id
                    ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-gray-700 dark:hover:text-gray-200'
                  }
                `}
              >
                <item.icon className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span>{item.label}</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* 底部设置按钮 */}
      <div className="flex-1" />
      <div className="flex items-center justify-center py-3 border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCurrentView('settings')}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150 ${
                currentView === 'settings'
                  ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <span>设置</span>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* 创建分组对话框 */}
      <Dialog open={createGroupDialog} onOpenChange={setCreateGroupDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-base">新建分组</DialogTitle>
            <DialogDescription className="text-xs">
              请输入分组名称
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
            placeholder="分组名称"
            className="mt-2"
            autoFocus
          />
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCreateGroupDialog(false);
                setNewGroupName('');
              }}
            >
              取消
            </Button>
            <Button size="sm" onClick={handleCreateGroup}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建标签对话框 */}
      <Dialog open={createTagDialog} onOpenChange={setCreateTagDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-base">新建标签</DialogTitle>
            <DialogDescription className="text-xs">
              请输入标签名称
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
            placeholder="标签名称"
            className="mt-2"
            autoFocus
          />
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCreateTagDialog(false);
                setNewTagName('');
              }}
            >
              取消
            </Button>
            <Button size="sm" onClick={handleCreateTag}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrSidebar;
