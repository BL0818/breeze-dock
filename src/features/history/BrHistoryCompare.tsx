import React, { useMemo } from 'react';
import { GitCompare, Plus, Minus, Clock } from 'lucide-react';
import { Note, NoteHistory } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================
// BrHistoryCompare - 版本对比组件
// ============================================================

export interface BrHistoryCompareProps {
  /** 历史版本数据 */
  history: NoteHistory | null;
  /** 当前笔记数据 */
  currentNote: Note | null;
  /** 对话框是否打开 */
  isOpen: boolean;
  /** 关闭对话框回调 */
  onClose: () => void;
}

/**
 * 差异行类型
 */
interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  content: string;
  lineNumber?: number;
}

/**
 * 简单文本差异计算
 */
function computeLineDiff(oldText: string, newText: string): {
  oldLines: DiffLine[];
  newLines: DiffLine[];
} {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const oldResult: DiffLine[] = [];
  const newResult: DiffLine[] = [];

  // 简单算法：按顺序比较
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined) {
      // 新增行
      newResult.push({ type: 'added', content: newLine });
      oldResult.push({ type: 'unchanged', content: '' });
    } else if (newLine === undefined) {
      // 删除行
      oldResult.push({ type: 'removed', content: oldLine });
      newResult.push({ type: 'unchanged', content: '' });
    } else if (oldLine === newLine) {
      // 未变化
      oldResult.push({ type: 'unchanged', content: oldLine });
      newResult.push({ type: 'unchanged', content: newLine });
    } else {
      // 修改行
      oldResult.push({ type: 'modified', content: oldLine });
      newResult.push({ type: 'modified', content: newLine });
    }
  }

  return { oldLines: oldResult, newLines: newResult };
}

/**
 * 格式化时间显示
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 统计差异数量
 */
function countDiffs(diffLines: DiffLine[]): { added: number; removed: number; modified: number } {
  return diffLines.reduce(
    (acc, line) => {
      if (line.type === 'added') acc.added++;
      else if (line.type === 'removed') acc.removed++;
      else if (line.type === 'modified') acc.modified++;
      return acc;
    },
    { added: 0, removed: 0, modified: 0 }
  );
}

export const BrHistoryCompare: React.FC<BrHistoryCompareProps> = ({
  history,
  currentNote,
  isOpen,
  onClose,
}) => {
  const { oldLines, newLines, titleChanged } = useMemo(() => {
    if (!history || !currentNote) {
      return { oldLines: [], newLines: [], titleChanged: false };
    }

    const titleChanged = history.title !== currentNote.title;
    const diff = computeLineDiff(history.content, currentNote.content);

    return {
      oldLines: diff.oldLines,
      newLines: diff.newLines,
      titleChanged,
    };
  }, [history, currentNote]);

  if (!isOpen || !history || !currentNote) return null;

  const oldDiffs = countDiffs(oldLines);
  const newDiffs = countDiffs(newLines);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200">
      {/* 对话框 */}
      <div className="w-full max-w-4xl max-h-[85vh] mx-4 bg-white dark:bg-[#1A1A1A] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in-0 duration-200">
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-subtle)] flex items-center justify-center">
                <GitCompare className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-[15px] font-medium text-gray-900 dark:text-gray-100">版本对比</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {history.createdAt && formatTime(history.createdAt)}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={onClose}>
              <span className="sr-only">关闭</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* 差异统计 */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[11px] text-gray-400">差异统计：</span>
            <div className="flex items-center gap-2">
              {oldDiffs.added + newDiffs.added > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Plus className="w-3 h-3" />
                  {oldDiffs.added + newDiffs.added}
                </span>
              )}
              {oldDiffs.removed + newDiffs.removed > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <Minus className="w-3 h-3" />
                  {oldDiffs.removed + newDiffs.removed}
                </span>
              )}
              {oldDiffs.modified + newDiffs.modified > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <span className="w-3 h-3">~</span>
                  {oldDiffs.modified + newDiffs.modified}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 对比内容 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左侧 - 历史版本 */}
          <div className="flex-1 flex flex-col border-r border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
            <div className="px-4 py-2 bg-gray-50 dark:bg-[#242424] border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400">历史版本</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-100/50 dark:bg-[#1A1A1A]/50">
              {/* 标题对比 */}
              <div className="mb-4">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">标题</div>
                <div className={cn(
                  "text-[14px] font-medium text-gray-700 dark:text-gray-300",
                  titleChanged && "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded px-2 py-1 -mx-2"
                )}>
                  {history.title || '无标题'}
                </div>
              </div>

              {/* 内容对比 */}
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">内容</div>
                <div className="font-mono text-[13px] leading-relaxed">
                  {oldLines.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "px-2 py-0.5 -mx-2 rounded",
                        line.type === 'removed' && "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
                        line.type === 'modified' && "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
                        line.type === 'added' && "bg-emerald-50 dark:bg-emerald-900/10 text-transparent",
                        line.type === 'unchanged' && "text-gray-600 dark:text-gray-400"
                      )}
                    >
                      <span className="inline-block w-6 text-gray-300 dark:text-gray-600 select-none">
                        {line.type !== 'added' ? idx + 1 : ''}
                      </span>
                      {line.content || (line.type === 'added' ? ' ' : '')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧 - 当前版本 */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-2 bg-gray-50 dark:bg-[#242424] border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[var(--color-primary)]" />
                <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400">当前版本</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* 标题对比 */}
              <div className="mb-4">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">标题</div>
                <div className={cn(
                  "text-[14px] font-medium text-gray-900 dark:text-gray-100",
                  titleChanged && "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded px-2 py-1 -mx-2"
                )}>
                  {currentNote.title || '无标题'}
                </div>
              </div>

              {/* 内容对比 */}
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">内容</div>
                <div className="font-mono text-[13px] leading-relaxed">
                  {newLines.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "px-2 py-0.5 -mx-2 rounded",
                        line.type === 'added' && "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
                        line.type === 'modified' && "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
                        line.type === 'removed' && "bg-red-50 dark:bg-red-900/10 text-transparent",
                        line.type === 'unchanged' && "text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <span className="inline-block w-6 text-gray-300 dark:text-gray-600 select-none">
                        {line.type !== 'removed' ? idx + 1 : ''}
                      </span>
                      {line.content || (line.type === 'removed' ? ' ' : '')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="px-5 py-3 border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] bg-gray-50/50 dark:bg-[#1A1A1A]/50">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrHistoryCompare;
