import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { AppSettings, ThemeMode, Language, WindowSettings, EditorSettings, ThemeColors, ShortcutSettings, SecuritySettings } from '../types';
import { DEFAULT_APP_SETTINGS } from '../types';

const STORAGE_KEY = 'breezenote-settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_APP_SETTINGS,
        ...parsed,
        window: { ...DEFAULT_APP_SETTINGS.window, ...parsed.window },
        editor: { ...DEFAULT_APP_SETTINGS.editor, ...parsed.editor },
        shortcuts: { ...DEFAULT_APP_SETTINGS.shortcuts, ...parsed.shortcuts },
        security: { ...DEFAULT_APP_SETTINGS.security, ...parsed.security },
      };
    }
  } catch { /* 静默 */ }
  return DEFAULT_APP_SETTINGS;
}

function persistSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* 静默 */ }
}

interface SettingActions {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  resetColors: () => void;
  setTheme: (theme: ThemeMode) => void;
  setFontSize: (size: number) => void;
  setAutoSaveDelay: (delay: number) => void;
  setLanguage: (language: Language) => void;
  togglePassword: () => void;
  toggleStartupOnBoot: () => void;
  toggleTrayIcon: () => void;
  toggleNotifications: () => void;
  setCloseToTray: (closeToTray: boolean) => void;
  setConfirmBeforeClose: (confirmBeforeClose: boolean) => void;
  updateWindowSettings: (updates: Partial<WindowSettings>) => void;
  updateEditorSettings: (updates: Partial<EditorSettings>) => void;
  updateColors: (colors: Partial<ThemeColors>) => void;
  setColors: (colors: ThemeColors) => void;
  updateShortcuts: (updates: Partial<ShortcutSettings>) => void;
  toggleShortcut: (key: keyof ShortcutSettings) => void;
  // Security settings
  setPasswordHash: (hash: string | null) => void;
  toggleWindowsHello: () => void;
  toggleIncognitoMode: () => void;
  toggleEncryption: () => void;
  setAutoLockTimeout: (minutes: number) => void;
  updateSecuritySettings: (updates: Partial<SecuritySettings>) => void;
}

export const useSettingStore = create<SettingActions>((set, get) => ({
  settings: loadSettings(),

  updateSettings: (updates) => {
    const newSettings = { ...get().settings, ...updates };
    persistSettings(newSettings);
    set({ settings: newSettings });
  },

  resetSettings: () => {
    persistSettings(DEFAULT_APP_SETTINGS);
    set({ settings: DEFAULT_APP_SETTINGS });
  },

  setTheme: (theme) => get().updateSettings({ theme }),
  setFontSize: (fontSize) => get().updateSettings({ fontSize }),
  setAutoSaveDelay: (autoSaveDelay) => get().updateSettings({ autoSaveDelay }),
  setLanguage: (language) => get().updateSettings({ language }),

  togglePassword: () => {
    get().updateSettings({ enablePassword: !get().settings.enablePassword });
  },
  toggleStartupOnBoot: async () => {
    const newState = !get().settings.startupOnBoot;
    try {
      if (newState) {
        await invoke('autostart_enable');
      } else {
        await invoke('autostart_disable');
      }
      get().updateSettings({ startupOnBoot: newState });
    } catch (error) {
      console.error('切换开机自启动失败:', error);
      // 即使失败也更新本地状态（下次启动时会重试）
      get().updateSettings({ startupOnBoot: newState });
    }
  },

  toggleTrayIcon: async () => {
    const newState = !get().settings.showTrayIcon;
    try {
      await invoke('set_tray_visible', { visible: newState });
      get().updateSettings({ showTrayIcon: newState });
    } catch (error) {
      console.error('切换托盘图标失败:', error);
      get().updateSettings({ showTrayIcon: newState });
    }
  },

  toggleNotifications: () => {
    get().updateSettings({ enableNotifications: !get().settings.enableNotifications });
  },

  setCloseToTray: (closeToTray) => {
    get().updateSettings({ closeToTray });
  },

  setConfirmBeforeClose: (confirmBeforeClose) => {
    get().updateSettings({ confirmBeforeClose });
  },

  updateWindowSettings: (updates) => {
    get().updateSettings({
      window: { ...get().settings.window, ...updates },
    });
  },

  updateEditorSettings: (updates) => {
    get().updateSettings({
      editor: { ...get().settings.editor, ...updates },
    });
  },

  updateColors: (colors) => {
    get().updateSettings({
      colors: { ...get().settings.colors, ...colors },
    });
  },

  setColors: (colors) => {
    get().updateSettings({ colors });
  },

  resetColors: () => {
    get().updateSettings({ colors: DEFAULT_APP_SETTINGS.colors });
  },

  updateShortcuts: (updates) => {
    get().updateSettings({
      shortcuts: { ...get().settings.shortcuts, ...updates },
    });
  },

  toggleShortcut: (key) => {
    const current = get().settings.shortcuts[key];
    get().updateSettings({
      shortcuts: { ...get().settings.shortcuts, [key]: !current },
    });
  },

  // Security settings
  setPasswordHash: (hash) => {
    get().updateSettings({
      security: { ...get().settings.security, passwordHash: hash },
    });
  },

  toggleWindowsHello: async () => {
    const newState = !get().settings.security.windowsHelloEnabled;
    try {
      if (newState) {
        await invoke('enable_windows_hello');
      } else {
        await invoke('disable_windows_hello');
      }
      get().updateSettings({
        security: { ...get().settings.security, windowsHelloEnabled: newState },
      });
    } catch (error) {
      console.error('切换 Windows Hello 失败:', error);
      get().updateSettings({
        security: { ...get().settings.security, windowsHelloEnabled: newState },
      });
    }
  },

  toggleIncognitoMode: () => {
    get().updateSettings({
      security: { ...get().settings.security, incognitoMode: !get().settings.security.incognitoMode },
    });
  },

  toggleEncryption: () => {
    get().updateSettings({
      security: { ...get().settings.security, encryptionEnabled: !get().settings.security.encryptionEnabled },
    });
  },

  setAutoLockTimeout: (minutes) => {
    get().updateSettings({
      security: { ...get().settings.security, autoLockTimeout: minutes },
    });
  },

  updateSecuritySettings: (updates) => {
    get().updateSettings({
      security: { ...get().settings.security, ...updates },
    });
  },
}));
