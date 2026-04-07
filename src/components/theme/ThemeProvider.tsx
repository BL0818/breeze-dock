import { useEffect } from 'react';
import { useSettingStore } from '@/stores/useSettingStore';

/**
 * ThemeProvider - 主题提供者
 * 根据设置动态应用 CSS 变量
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colors = useSettingStore((s) => s.settings.colors);

  useEffect(() => {
    // 应用主题颜色到 CSS 变量
    const root = document.documentElement;

    // 主色
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-hover', adjustColor(colors.primary, 10));
    root.style.setProperty('--color-primary-subtle', `${colors.primary}1A`);

    // 成功色
    root.style.setProperty('--color-success', colors.success);

    // 警告色
    root.style.setProperty('--color-warning', colors.warning);

    // 错误色
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-danger', colors.error);

    // 信息色
    root.style.setProperty('--color-info', colors.info);

    // shadcn 变量
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', '#FFFFFF');
    root.style.setProperty('--ring', colors.primary);

    // 更新侧边栏主题变量
    root.style.setProperty('--sidebar-primary', colors.primary);
    root.style.setProperty('--sidebar-ring', colors.primary);
  }, [colors]);

  return <>{children}</>;
}

/**
 * 调整颜色亮度
 * @param color - 十六进制颜色
 * @param percent - 亮度调整百分比
 */
function adjustColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

export default ThemeProvider;
