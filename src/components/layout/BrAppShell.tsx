import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useTheme } from '../../hooks/useTheme';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSettingStore } from '../../stores/useSettingStore';
import { useNoteStore } from '../../stores/useNoteStore';
import { useGroupStore } from '../../stores/useGroupStore';
import { useTagStore } from '../../stores/useTagStore';
import { useUIStore } from '../../stores/useUIStore';

interface BrAppShellProps {
  children: React.ReactNode;
}

/**
 * 全局壳组件 - Linear 极简风格
 *
 * 职责：
 * 1. 主题注入（亮色/暗色/跟随系统）
 * 2. 字号全局设置
 * 3. 初始数据加载（notes / groups / tags）
 * 4. 全局快捷键挂载
 * 5. 窗口关闭事件监听
 */
export const BrAppShell: React.FC<BrAppShellProps> = ({ children }) => {
  const fontSize = useSettingStore((s) => s.settings.fontSize);
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const loadGroups = useGroupStore((s) => s.loadGroups);
  const loadTags = useTagStore((s) => s.loadTags);
  const { settings } = useSettingStore();
  const openCloseConfirmModal = useUIStore((s) => s.openCloseConfirmModal);

  // 主题管理
  useTheme();
  // 全局快捷键（Ctrl+N/F/B/,）
  useKeyboard();

  // 字号全局设置
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  // 初始数据加载
  useEffect(() => {
    loadNotes();
    loadGroups();
    loadTags();
  }, [loadNotes, loadGroups, loadTags]);

  // 监听窗口关闭事件（来自 Rust 端）
  useEffect(() => {
    const unlisten = listen('window-close-requested', () => {
      if (settings.confirmBeforeClose) {
        openCloseConfirmModal();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [settings.confirmBeforeClose, openCloseConfirmModal]);

  return (
    <div className="h-full w-full overflow-hidden bg-white dark:bg-[#141414] text-gray-900 dark:text-gray-100 antialiased">
      {children}
    </div>
  );
};

export default BrAppShell;
