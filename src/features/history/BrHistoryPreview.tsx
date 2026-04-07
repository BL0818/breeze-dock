import React from 'react';
import { History, X, Clock } from 'lucide-react';
import { Note, NoteHistory } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ============================================================
// BrHistoryPreview - 历史版本预览组件
// ============================================================

export interface BrHistoryPreviewProps {
  /** 历史版本数据 */
  history: NoteHistory | null;
  /** 当前笔记数据（用于参考） */
  currentNote: Note | null;
  /** 对话框是否打开 */
  isOpen: boolean;
  /** 关闭对话框回调 */
  onClose: () => void;
}

/**
 * 格式化时间显示
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return `${diffDays} 天前`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
}

export const BrHistoryPreview: React.FC<BrHistoryPreviewProps> = ({
  history,
  currentNote,
  isOpen,
  onClose,
}) => {
  if (!history) return null;

  const isChanged = currentNote && (
    history.title !== currentNote.title ||
    history.content !== currentNote.content
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        {/* 头部 */}
        <DialogHeader className="px-5 py-4 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-subtle)] flex items-center justify-center">
                <History className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
              <DialogTitle className="text-[15px] font-medium">历史版本预览</DialogTitle>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* 时间标签 */}
        <div className="px-5 py-3 flex items-center gap-2 bg-gray-50 dark:bg-[#242424] border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[12px] text-gray-500">
            保存于 {formatTime(history.createdAt)}
          </span>
          {isChanged && (
            <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              已有更改
            </span>
          )}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* 标题 */}
          <div className="mb-4">
            <h3 className={cn(
              "text-[16px] font-semibold text-gray-900 dark:text-gray-100 leading-relaxed",
              history.title !== currentNote?.title && "text-amber-600 dark:text-amber-400"
            )}>
              {history.title || '无标题'}
            </h3>
          </div>

          {/* 内容 */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className={cn(
              "text-[14px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap",
              history.content !== currentNote?.content && "bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3"
            )}>
              {history.content || '（空内容）'}
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="px-5 py-3 border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] bg-gray-50/50 dark:bg-[#1A1A1A]/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              ID: {history.id.slice(0, 8)}...
            </span>
            <Button variant="outline" size="sm" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrHistoryPreview;
