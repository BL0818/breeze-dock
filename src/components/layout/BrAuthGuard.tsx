import { Navigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useSettingStore } from '../../stores/useSettingStore';
import { useUIStore } from '../../stores/useUIStore';

/**
 * 路由认证守卫
 * - 密码未启用 → 放行
 * - 密码启用 + 锁屏可见 → 重定向 /lock
 * - 密码启用 + 已解锁 → 放行
 */
export const BrAuthGuard: React.FC = () => {
  const enablePassword = useSettingStore((s) => s.settings.enablePassword);
  const lockScreenVisible = useUIStore((s) => s.lockScreenVisible);

  if (enablePassword && lockScreenVisible) {
    return <Navigate to="/lock" replace />;
  }

  return <Outlet />;
};

export default BrAuthGuard;
