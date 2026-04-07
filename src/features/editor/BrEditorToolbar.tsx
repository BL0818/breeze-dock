import React, { useState, useCallback } from 'react';
import { useNoteStore } from '../../stores/useNoteStore';
import { useFloatingWindow } from '../../hooks/useFloatingWindow';
import type { NoteTemplate } from '../../types';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FileText, CheckSquare, Notebook, Code, Lightbulb, Copy, ExternalLink, Pin, Star, Archive, Trash2, X, History, FilePenLine, Image, AlignLeft } from 'lucide-react';
import { toast } from 'sonner';
import { copyPlainText, copyAsMarkdown } from '../../utils/clipboard';
import BrHistoryTimeline from '../history/BrHistoryTimeline';

// ============================================================
// BrEditorToolbar - Linear 极简风格编辑器工具栏
// ============================================================

export interface BrEditorToolbarProps {
  noteId: string;
}

const templateOptions: { value: NoteTemplate; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'blank', label: '空白', icon: FileText },
  { value: 'todo', label: '待办', icon: CheckSquare },
  { value: 'note', label: '笔记', icon: Notebook },
  { value: 'snippet', label: '代码片段', icon: Code },
  { value: 'idea', label: '想法', icon: Lightbulb },
];

const BrEditorToolbar: React.FC<BrEditorToolbarProps> = ({ noteId }) => {
  const notes = useNoteStore((s) => s.notes);
  const updateNote = useNoteStore((s) => s.updateNote);
  const pinNote = useNoteStore((s) => s.pinNote);
  const starNote = useNoteStore((s) => s.starNote);
  const archiveNote = useNoteStore((s) => s.archiveNote);
  const trashNote = useNoteStore((s) => s.trashNote);
  const { createFloatingWindow } = useFloatingWindow();

  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);

  const currentNote = notes.find((n) => n.id === noteId);

  // 复制为纯文本
  const handleCopyPlainText = useCallback(async () => {
    if (!currentNote) return;
    try {
      const text = currentNote.title
        ? `${currentNote.title}\n\n${currentNote.content}`
        : currentNote.content;
      const success = await copyPlainText(text);
      if (success) {
        toast.success('已复制为纯文本');
      } else {
        toast.error('复制失败');
      }
    } catch {
      toast.error('复制失败');
    }
  }, [currentNote]);

  // 复制为 Markdown
  const handleCopyMarkdown = useCallback(async () => {
    if (!currentNote) return;
    try {
      const success = await copyAsMarkdown(currentNote.title, currentNote.content);
      if (success) {
        toast.success('已复制为 Markdown');
      } else {
        toast.error('复制失败');
      }
    } catch {
      toast.error('复制失败');
    }
  }, [currentNote]);

  // 复制为图片
  const handleCopyAsImage = useCallback(async () => {
    if (!currentNote) return;

    toast.loading('正在生成图片...', { id: 'copy-image' });

    try {
      // 动态导入 html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // 创建临时容器渲染内容
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 600px;
        padding: 32px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #1a1a2e;
      `;

      // 标题
      const titleEl = document.createElement('div');
      titleEl.style.cssText = `
        font-size: 24px;
        font-weight: 700;
        color: white;
        margin-bottom: 16px;
        text-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      titleEl.textContent = currentNote.title || '无标题';

      // 内容
      const contentEl = document.createElement('div');
      contentEl.style.cssText = `
        font-size: 14px;
        line-height: 1.8;
        color: rgba(255,255,255,0.95);
        white-space: pre-wrap;
        word-break: break-word;
      `;
      contentEl.textContent = currentNote.content || '（空内容）';

      tempContainer.appendChild(titleEl);
      tempContainer.appendChild(contentEl);
      document.body.appendChild(tempContainer);

      // 使用 html2canvas 生成图片
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // 移除临时容器
      document.body.removeChild(tempContainer);

      // 转换为 Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) {
        toast.error('图片生成失败', { id: 'copy-image' });
        return;
      }

      // 复制到剪贴板
      if (navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        toast.success('已复制为图片', { id: 'copy-image' });
      } else {
        toast.error('当前浏览器不支持复制图片', { id: 'copy-image' });
      }
    } catch (error) {
      console.error('Copy as image error:', error);
      toast.error('复制图片失败', { id: 'copy-image' });
    }
  }, [currentNote]);

  const handleFloating = useCallback(async () => {
    if (!currentNote) return;
    try {
      await createFloatingWindow({ note: currentNote });
    } catch {
      // 悬浮窗创建失败时静默处理
    }
  }, [currentNote, createFloatingWindow]);

  const handleTemplateChange = useCallback(
    (template: NoteTemplate) => {
      updateNote(noteId, { template });
      setTemplateModalVisible(false);
    },
    [noteId, updateNote],
  );

  if (!currentNote) return null;

  const CurrentIcon = templateOptions.find((t) => t.value === currentNote.template)?.icon ?? FileText;

  return (
    <>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
        {/* 左侧工具 */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={CurrentIcon}
            tooltip="切换模板"
            onClick={() => setTemplateModalVisible(true)}
          />
        </div>

        {/* 右侧操作 */}
        <div className="flex items-center gap-0.5">
          {/* 复制下拉菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-md transition-colors duration-150 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] hover:text-gray-700 dark:hover:text-gray-200"
                title="复制内容"
              >
                <Copy className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <DropdownMenuItem onClick={handleCopyPlainText} className="gap-2.5">
                <AlignLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>复制为纯文本</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyMarkdown} className="gap-2.5">
                <FilePenLine className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>复制为 Markdown</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopyAsImage} className="gap-2.5">
                <Image className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>复制为图片</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ToolbarButton icon={ExternalLink} tooltip="悬浮窗" onClick={handleFloating} />

          <div className="w-px h-4 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] mx-1.5" />

          <ToolbarButton
            icon={Pin}
            tooltip={currentNote.isPinned ? '取消置顶' : '置顶'}
            active={currentNote.isPinned}
            onClick={() => pinNote(noteId, !currentNote.isPinned)}
          />

          <ToolbarButton
            icon={Star}
            tooltip={currentNote.isStarred ? '取消星标' : '星标'}
            active={currentNote.isStarred}
            onClick={() => starNote(noteId, !currentNote.isStarred)}
          />

          <ToolbarButton
            icon={Archive}
            tooltip="归档"
            onClick={() => archiveNote(noteId, !currentNote.isArchived)}
          />

          <ToolbarButton
            icon={History}
            tooltip="历史版本"
            onClick={() => setHistoryPanelOpen(true)}
          />

          <ToolbarButton
            icon={Trash2}
            tooltip="删除"
            onClick={() => trashNote(noteId)}
            danger
          />
        </div>
      </div>

      {/* 历史版本面板 */}
      <BrHistoryTimeline
        noteId={noteId}
        isOpen={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        onRollback={() => setHistoryPanelOpen(false)}
      />

      {/* 模板选择弹窗 */}
      {templateModalVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setTemplateModalVisible(false)}
        >
          <div
            className="w-[420px] bg-white dark:bg-[#1F1F1F] rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
              <span className="text-[14px] font-medium text-gray-900 dark:text-gray-100">选择模板</span>
              <button
                onClick={() => setTemplateModalVisible(false)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 选项 */}
            <div className="p-4">
              <div className="grid grid-cols-5 gap-3">
                {templateOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = currentNote.template === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleTemplateChange(opt.value)}
                      className={`
                        flex flex-col items-center gap-2 py-3 px-2 rounded-md transition-colors duration-150
                        ${isSelected
                          ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
                          : 'hover:bg-gray-100 dark:hover:bg-[#2E2E2E] text-gray-500 dark:text-gray-400'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-[12px] whitespace-nowrap">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// 工具栏按钮
interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon: Icon,
  tooltip,
  active = false,
  danger = false,
  onClick,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        className={`
          w-8 h-8 flex items-center justify-center rounded-md transition-colors duration-150
          ${active
            ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
            : danger
              ? 'text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] hover:text-gray-700 dark:hover:text-gray-200'
          }
        `}
      >
        <Icon className="w-4 h-4" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <span>{tooltip}</span>
    </TooltipContent>
  </Tooltip>
);

export default BrEditorToolbar;
