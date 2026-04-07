import React, { useMemo } from 'react';
import type { Note } from '../../types';
import { highlightText } from '../../utils/search';
import { formatDate } from '../../utils/format';
import { Clock, Pin } from 'lucide-react';

// ============================================================
// BrSearchResult - Linear 极简风格搜索结果项
// ============================================================

export interface BrSearchResultProps {
  note: Note;
  query: string;
  onClick: () => void;
}

const BrSearchResult: React.FC<BrSearchResultProps> = ({
  note,
  query,
  onClick,
}) => {
  const highlightedTitle = useMemo(
    () => highlightText(note.title || '无标题', query),
    [note.title, query],
  );

  const highlightedContent = useMemo(() => {
    const content = note.content || '';
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerQuery);

    let snippet = '';
    if (matchIndex >= 0) {
      const start = Math.max(0, matchIndex - 30);
      const end = Math.min(content.length, matchIndex + query.length + 60);
      snippet = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
    } else {
      snippet = content.slice(0, 100);
    }

    return highlightText(snippet, query);
  }, [note.content, query]);

  return (
    <div
      onClick={onClick}
      className="p-3 rounded-md bg-white dark:bg-[#141414] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] cursor-pointer hover:border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] transition-colors duration-150"
    >
      {/* 标题 */}
      <h4
        className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-1 truncate"
        dangerouslySetInnerHTML={{ __html: highlightedTitle }}
      />

      {/* 内容摘要 */}
      <p
        className="text-[13px] text-gray-500 line-clamp-2 mb-2 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
      />

      {/* 底部信息 */}
      <div className="flex items-center gap-3 text-[11px] text-gray-400">
        <Clock className="w-3 h-3" />
        <span>{formatDate(note.updatedAt)}</span>
        {note.isPinned && (
          <span className="flex items-center gap-1 text-[var(--color-primary)]">
            <Pin className="w-3 h-3" />
            已置顶
          </span>
        )}
      </div>
    </div>
  );
};

export default BrSearchResult;
