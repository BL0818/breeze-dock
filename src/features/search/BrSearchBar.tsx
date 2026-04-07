import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useNoteStore } from '../../stores/useNoteStore';
import { useUIStore } from '../../stores/useUIStore';
import { Search } from 'lucide-react';
import BrSearchResult from './BrSearchResult';
import { searchNotes } from '../../utils/search';

// ============================================================
// BrSearchBar - Linear 极简风格搜索栏
// 支持 ESC 关闭、自动聚焦、选中后关闭搜索
// ============================================================

const BrSearchBar: React.FC = () => {
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const closeSearch = useUIStore((s) => s.closeSearch);
  const notes = useNoteStore((s) => s.notes);
  const selectNote = useNoteStore((s) => s.selectNote);
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦搜索输入框
  useEffect(() => {
    // 延迟聚焦，确保 DOM 已渲染
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // ESC 关闭搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSearch]);

  const results = useMemo(
    () => searchQuery ? searchNotes(notes.filter((n) => !n.isTrashed), searchQuery) : [],
    [notes, searchQuery],
  );

  const handleSelect = useCallback(
    (noteId: string) => {
      selectNote(noteId);
      setCurrentView('all');
      // 选中笔记后关闭搜索视图
      closeSearch();
    },
    [selectNote, setCurrentView, closeSearch],
  );

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* 搜索标题 */}
      <h2 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100 mb-4">搜索</h2>

      {/* 搜索输入框 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索笔记标题或内容..."
          className="w-full h-10 pl-9 pr-3 rounded-md bg-white dark:bg-[#1A1A1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] text-[14px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)] transition-colors"
        />
      </div>

      {/* 搜索结果 */}
      <div>
        {searchQuery && (
          <p className="text-[13px] text-gray-500 mb-3">
            找到 {results.length} 条结果
          </p>
        )}
        {results.length > 0 ? (
          <div className="flex flex-col gap-1">
            {results.map((note) => (
              <BrSearchResult
                key={note.id}
                note={note}
                query={searchQuery}
                onClick={() => handleSelect(note.id)}
              />
            ))}
          </div>
        ) : (
          searchQuery && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Search className="w-10 h-10 mb-3" />
              <p className="text-[13px]">没有找到匹配的笔记</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default BrSearchBar;
