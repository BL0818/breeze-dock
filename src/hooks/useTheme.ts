import { useEffect, useCallback } from 'react';
import { useSettingStore } from '../stores/useSettingStore';

type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 主题管理 Hook
 * - 监听设置中的主题模式
 * - 自动切换 HTML class
 * - 监听系统主题变化
 */
export function useTheme() {
  const theme = useSettingStore((s) => s.settings.theme);
  const updateSettings = useSettingStore((s) => s.updateSettings);

  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    let isDark = false;

    if (mode === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = mode === 'dark';
    }

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  // 响应主题设置变化
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // 监听系统主题变化（仅在 system 模式下生效）
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Record<ThemeMode, ThemeMode> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };
    updateSettings({ theme: next[theme] });
  }, [theme, updateSettings]);

  return { theme, setTheme: (t: ThemeMode) => updateSettings({ theme: t }), toggleTheme };
}
