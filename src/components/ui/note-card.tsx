import { cn } from '@/lib/utils';
import { Pin, Star } from 'lucide-react';

// ============================================================
// NoteCard - Linear 极简风格笔记卡片
// ============================================================

export interface NoteCardProps {
  title: string;
  content: string;
  time: string;
  isPinned?: boolean;
  isStarred?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  title,
  content,
  time,
  isPinned = false,
  isStarred = false,
  isActive = false,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full text-left p-2.5 rounded-md transition-all duration-150 group',
      isActive
        ? 'bg-[var(--color-primary-subtle)]'
        : 'hover:bg-gray-100 dark:hover:bg-[#1A1A1A]'
    )}
  >
    {/* 标题行 */}
    <div className="flex items-center gap-2 mb-1">
      <span
        className={cn(
          'text-[13px] font-medium truncate flex-1 leading-tight',
          isActive ? 'text-[var(--color-primary)]' : 'text-gray-900 dark:text-gray-100'
        )}
      >
        {title}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isPinned && (
          <Pin className="w-3 h-3 text-gray-400" />
        )}
        {isStarred && (
          <Star className="w-3 h-3 text-gray-400 fill-gray-300 dark:fill-gray-700" />
        )}
      </div>
    </div>

    {/* 内容摘要 */}
    <p className="text-[12px] text-gray-500 truncate leading-relaxed">
      {content}
    </p>

    {/* 时间 */}
    <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">
      {time}
    </p>
  </button>
);

export default NoteCard;
