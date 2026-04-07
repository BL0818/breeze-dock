import { useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { useSettingStore } from '../stores/useSettingStore';
import { useNoteStore } from '../stores/useNoteStore';
import { useUIStore } from '../stores/useUIStore';
import { v4 as uuidv4 } from 'uuid';

/** 快捷键定义 */
export interface GlobalShortcut {
  key: keyof typeof SHORTCUT_KEYS;
  shortcut: string;
  description: string;
}

export const SHORTCUT_KEYS = {
  createNote: 'CommandOrControl+Shift+N',
  globalSearch: 'CommandOrControl+Shift+F',
  showMainWindow: 'CommandOrControl+Shift+B',
  createFloating: 'CommandOrControl+Shift+L',
} as const;

export const SHORTCUT_DEFINITIONS: GlobalShortcut[] = [
  { key: 'createNote', shortcut: SHORTCUT_KEYS.createNote, description: '新建笔记' },
  { key: 'globalSearch', shortcut: SHORTCUT_KEYS.globalSearch, description: '全局搜索' },
  { key: 'showMainWindow', shortcut: SHORTCUT_KEYS.showMainWindow, description: '呼出主窗口' },
  { key: 'createFloating', shortcut: SHORTCUT_KEYS.createFloating, description: '新建悬浮标签' },
];

/**
 * 全局快捷键 Hook
 * 使用 Tauri global-shortcut 插件注册系统级全局快捷键
 * 与 useSettingStore 集成，支持禁用特定快捷键
 */
export function useGlobalShortcuts() {
  const shortcuts = useSettingStore((s) => s.settings.shortcuts);
  const createNote = useNoteStore((s) => s.createNote);
  const openSearch = useUIStore((s) => s.openSearch);
  const addFloating = useUIStore((s) => s.addFloating);
  const showToast = useUIStore((s) => s.showToast);

  // 使用 ref 防止重复注册
  const isRegistering = useRef(false);

  const handleCreateNote = useCallback(async () => {
    try {
      await createNote('blank', null);
    } catch (error) {
      console.error('[GlobalShortcut] 创建笔记失败:', error);
    }
  }, [createNote]);

  const handleGlobalSearch = useCallback(() => {
    openSearch();
  }, [openSearch]);

  const handleShowMainWindow = useCallback(async () => {
    try {
      await invoke('show_main_window');
    } catch (error) {
      console.error('[GlobalShortcut] 显示主窗口失败:', error);
    }
  }, []);

  const handleCreateFloating = useCallback(async () => {
    try {
      const noteId = uuidv4();
      const label = `floating-${noteId}`;
      await invoke('create_floating', {
        label,
        noteId,
        width: 320,
        height: 400,
        x: null,
        y: null,
        alwaysOnTop: true,
        transparent: true,
        opacity: 0.95,
        skipTaskbar: false,
        resizable: true,
        decorations: false,
      });
      addFloating({
        noteId,
        x: 100,
        y: 100,
        width: 320,
        height: 400,
        opacity: 0.95,
        isPenetrable: false,
        isCollapsed: false,
      });
      showToast('success', '悬浮笔记已创建');
    } catch (error) {
      console.error('[GlobalShortcut] 创建悬浮笔记失败:', error);
      showToast('error', `创建失败: ${error}`);
    }
  }, [addFloating, showToast]);

  const registerShortcuts = useCallback(async () => {
    // 防止重复注册
    if (isRegistering.current) return;
    isRegistering.current = true;

    try {
      // 先注销所有已注册的快捷键
      await Promise.all(
        SHORTCUT_DEFINITIONS.map(async (def) => {
          try {
            const registered = await isRegistered(def.shortcut);
            if (registered) {
              await unregister(def.shortcut);
            }
          } catch {
            // 忽略注销错误
          }
        })
      );

      // 遍历所有快捷键定义，根据设置状态注册
      await Promise.all(
        SHORTCUT_DEFINITIONS.map(async (def) => {
          const isEnabled = shortcuts[def.key];
          const shortcutStr = def.shortcut;

          if (!isEnabled) return;

          try {
            // 先检查是否已注册，避免 React 双重调用 useEffect 导致冲突
            const alreadyRegistered = await isRegistered(shortcutStr);
            if (alreadyRegistered) {
              console.log(`[GlobalShortcut] 跳过(已注册): ${shortcutStr}`);
              return;
            }

            let handler: () => void;
            switch (def.key) {
              case 'createNote':
                handler = handleCreateNote;
                break;
              case 'globalSearch':
                handler = handleGlobalSearch;
                break;
              case 'showMainWindow':
                handler = handleShowMainWindow;
                break;
              case 'createFloating':
                handler = handleCreateFloating;
                break;
              default:
                return;
            }
            await register(shortcutStr, handler);
            console.log(`[GlobalShortcut] 已注册: ${shortcutStr}`);
          } catch (error) {
            console.error(`[GlobalShortcut] 注册失败 ${shortcutStr}:`, error);
          }
        })
      );
    } finally {
      isRegistering.current = false;
    }
  }, [shortcuts, handleCreateNote, handleGlobalSearch, handleShowMainWindow, handleCreateFloating]);

  // 注册/注销快捷键
  useEffect(() => {
    registerShortcuts();

    // 组件卸载时注销所有快捷键
    return () => {
      // 取消进行中的注册
      isRegistering.current = false;

      // 同步注销所有快捷键
      SHORTCUT_DEFINITIONS.forEach((def) => {
        unregister(def.shortcut).catch(() => {
          // 静默忽略注销错误
        });
      });
    };
    // 只在 shortcuts 启用状态变化时重新注册，不依赖 registerShortcuts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcuts]);

  return {
    shortcuts,
    SHORTCUT_DEFINITIONS,
  };
}
