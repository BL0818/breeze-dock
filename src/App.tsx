import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import BrAppShell from './components/layout/BrAppShell';
import BrAuthGuard from './components/layout/BrAuthGuard';
import BrWindowFrame from './components/layout/BrWindowFrame';
import BrLockScreen from './features/security/BrLockScreen';
import BrNavigateHome from './components/layout/BrNavigateHome';
import BrFloatingContainer from './components/layout/BrFloatingContainer';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';

/**
 * 从窗口标签判断是否为悬浮窗模式
 */
function useIsFloatingMode(): { isFloating: boolean; loading: boolean } {
  const [isFloating, setIsFloating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const l = getCurrentWindow().label;
      setIsFloating(l.startsWith('floating-'));
    } catch (e) {
      // 非 Tauri 环境（浏览器开发）
    } finally {
      setLoading(false);
    }
  }, []);

  return { isFloating, loading };
}

/**
 * 根组件
 *
 * 路由结构：
 * - /lock        → 锁屏（无需认证）
 * - /            → 主窗口框架（需认证）
 *   - 侧边栏 + 编辑器/搜索/回收站/设置 由 BrWindowFrame 内部视图状态控制
 * - /floating    → 悬浮窗内容（独立窗口，无需认证）
 * - *            → 404 兜底重定向到 /
 */
const App: React.FC = () => {
  const { isFloating, loading } = useIsFloatingMode();

  // 注册全局快捷键（非悬浮窗模式）
  useGlobalShortcuts();

  if (loading) {
    return (
      <ThemeProvider>
        <div className="w-full h-screen flex items-center justify-center bg-[#F7F8FA] dark:bg-[#141414]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#165DFF] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#86909C]">正在初始化...</span>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={100}>
        <BrAppShell>
          {isFloating ? (
            <BrFloatingContainer />
          ) : (
            <Routes>
              {/* 锁屏路由 - 优先匹配 */}
              <Route path="/lock" element={<BrLockScreen />} />

              {/* 受保护路由 */}
              <Route element={<BrAuthGuard />}>
                <Route path="/" element={<BrWindowFrame />} />
                <Route path="/settings" element={<BrWindowFrame />} />
              </Route>

              {/* 兜底 */}
              <Route path="*" element={<BrNavigateHome />} />
            </Routes>
          )}
          <Toaster />
        </BrAppShell>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
