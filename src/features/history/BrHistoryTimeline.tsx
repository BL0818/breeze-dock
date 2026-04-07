"use client";

import React, { useEffect, useState } from 'react';
import { useNoteStore } from '../../stores/useNoteStore';
import { formatFullDate, formatRelativeTime } from '../../utils/format';
import type { NoteHistory } from '../../types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Eye, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// BrHistoryTimeline - Linear 极简风格历史版本时间轴
// ============================================================

export interface BrHistoryTimelineProps {
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
  onRollback: (historyId: string) => void;
}

const BrHistoryTimeline: React.FC<BrHistoryTimelineProps> = ({
  noteId,
  isOpen,
  onClose,
  onRollback,
}) => {
  const histories = useNoteStore((s) => s.histories);
  const loadHistory = useNoteStore((s) => s.loadHistory);
  const rollbackNote = useNoteStore((s) => s.rollbackNote);
  const notes = useNoteStore((s) => s.notes);

  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  const currentNote = notes.find((n) => n.id === noteId);

  // 加载历史记录
  useEffect(() => {
    if (isOpen && noteId) {
      loadHistory(noteId);
    }
  }, [isOpen, noteId, loadHistory]);

  // 预览历史版本
  const handlePreview = (history: NoteHistory) => {
    setPreviewingId(history.id);
  };

  // 关闭预览
  const handleClosePreview = () => {
    setPreviewingId(null);
  };

  // 回滚到指定版本
  const handleRollback = async (historyId: string) => {
    setRolling(true);
    try {
      const note = await rollbackNote(noteId, historyId);
      if (note) {
        onRollback(historyId);
        onClose();
        toast.success('已回滚到指定版本');
      }
    } finally {
      setRolling(false);
    }
  };

  // 确认回滚
  const confirmRollback = (historyId: string) => {
    toast.error('回滚将丢失当前版本，是否继续？', {
      action: {
        label: '确认回滚',
        onClick: () => handleRollback(historyId),
      },
      duration: 5000,
    });
  };

  // 预览中的历史版本
  const previewingHistory = histories.find((h) => h.id === previewingId);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[420px] p-0 flex flex-col">
        {/* 头部 */}
        <SheetHeader className="px-5 py-4 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <SheetTitle className="text-[15px] font-semibold">历史版本</SheetTitle>
          <SheetDescription className="text-xs text-gray-500 dark:text-gray-400">
            {currentNote?.title || '笔记'}
          </SheetDescription>
        </SheetHeader>

        {/* 预览区域 */}
        {previewingHistory && (
          <div className="border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] bg-gray-50/50 dark:bg-[#2E2E2E]/50">
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">
                预览: {previewingHistory.title}
              </span>
              <button
                onClick={handleClosePreview}
                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 pb-4 max-h-[200px] overflow-y-auto">
              <pre className="text-[13px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {previewingHistory.content || '(空)'}
              </pre>
            </div>
          </div>
        )}

        {/* 时间轴列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {histories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <HistoryIcon className="w-12 h-12 mb-3 opacity-30" />
              <span className="text-[13px]">暂无历史版本</span>
            </div>
          ) : (
            <div className="relative">
              {/* 时间轴竖线 */}
              <div className="absolute left-[15px] top-0 bottom-0 w-px bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)]" />

              {/* 历史节点列表 */}
              <div className="space-y-4">
                {histories.map((history, index) => (
                  <HistoryNode
                    key={history.id}
                    history={history}
                    isFirst={index === 0}
                    isLast={index === histories.length - 1}
                    isPreviewing={previewingId === history.id}
                    onPreview={() => handlePreview(history)}
                    onRollback={() => confirmRollback(history.id)}
                    rolling={rolling}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ============================================================
// HistoryNode - 时间轴节点
// ============================================================

interface HistoryNodeProps {
  history: NoteHistory;
  isFirst: boolean;
  isLast: boolean;
  isPreviewing: boolean;
  onPreview: () => void;
  onRollback: () => void;
  rolling: boolean;
}

const HistoryNode: React.FC<HistoryNodeProps> = ({
  history,
  isFirst,
  isLast: _isLast,
  isPreviewing,
  onPreview,
  onRollback,
  rolling,
}) => {
  return (
    <div className="relative flex gap-4">
      {/* 圆形节点 */}
      <div
        className={`
          relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center
          transition-all duration-150
          ${isFirst
            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
            : 'bg-white dark:bg-[#1F1F1F] border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.1)]'
          }
          ${isPreviewing ? 'ring-2 ring-[var(--color-primary)] ring-offset-2' : ''}
        `}
      >
        <HistoryDot className={`w-2 h-2 rounded-full ${isFirst ? 'bg-white' : 'bg-gray-300 dark:bg-gray-600'}`} />
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-w-0 pb-4">
        {/* 时间 */}
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[13px] font-medium ${isFirst ? 'text-[var(--color-primary)]' : 'text-gray-600 dark:text-gray-400'}`}>
            {isFirst ? formatRelativeTime(history.createdAt) : formatFullDate(history.createdAt)}
          </span>
          {isFirst && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              最新
            </span>
          )}
        </div>

        {/* 标题预览 */}
        <div className="text-[14px] text-gray-900 dark:text-gray-100 font-medium truncate mb-1">
          {history.title || '(无标题)'}
        </div>

        {/* 内容预览 */}
        <div className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
          {history.content?.slice(0, 100) || '(空)'}
          {(history.content?.length || 0) > 100 && '...'}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPreview}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium
              transition-colors duration-150
              ${isPreviewing
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] hover:text-gray-700 dark:hover:text-gray-200'
              }
            `}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>预览</span>
          </button>

          <button
            onClick={onRollback}
            disabled={rolling || isFirst}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium
              transition-colors duration-150
              ${isFirst
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500'
              }
            `}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>回滚</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 历史图标组件
// ============================================================

const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HistoryDot: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className} />
);

export default BrHistoryTimeline;
