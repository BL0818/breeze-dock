import React from 'react';

export interface BrProgressBarProps {
  /** 当前完成数量 */
  completed: number;
  /** 总数量 */
  total: number;
  /** 是否显示百分比数字 */
  showLabel?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============================================================
// BrProgressBar - Linear 极简风格进度条
// ============================================================

const BrProgressBar: React.FC<BrProgressBarProps> = ({
  completed,
  total,
  showLabel = true,
  className = '',
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isAllDone = completed === total && total > 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* 进度条 */}
      <div className="flex-1 h-1.5 bg-[#2E2E2E] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: 'var(--color-primary)',
          }}
        />
      </div>

      {/* 标签 */}
      {showLabel && (
        <span
          className={`text-[12px] font-medium tabular-nums shrink-0 ${
            isAllDone ? 'text-[var(--color-primary)]' : 'text-gray-400'
          }`}
        >
          {isAllDone ? `${percentage}%` : `${completed}/${total}`}
        </span>
      )}
    </div>
  );
};

export default BrProgressBar;
