import { useEffect } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { useNoteStore } from '../stores/useNoteStore';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: () => void;
}

/**
 * 全局快捷键 Hook
 * - Ctrl+N 新建笔记
 * - Ctrl+F 打开搜索
 * - Ctrl+B 切换侧边栏
 * - Ctrl+, 打开设置
 */
export function useKeyboard() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openSearch = useUIStore((s) => s.openSearch);
  const createNote = useNoteStore((s) => s.createNote);
  const setCurrentView = useUIStore((s) => s.setCurrentView);

  useEffect(() => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'n', ctrl: true, handler: () => createNote() },
      { key: 'f', ctrl: true, handler: () => openSearch() },
      { key: 'b', ctrl: true, handler: () => toggleSidebar() },
      { key: ',', ctrl: true, handler: () => setCurrentView('settings') },
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = s.shift ? e.shiftKey : true;
        if (e.key.toLowerCase() === s.key && ctrlMatch && shiftMatch) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, openSearch, createNote, setCurrentView]);
}
