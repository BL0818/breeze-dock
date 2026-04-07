import { Outlet } from 'react-router-dom';
import { useUIStore } from '../../stores/useUIStore';

/**
 * 主内容区布局 - Linear 极简风格
 */
export const BrMainLayout: React.FC = () => {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 笔记列表 */}
      <div
        className={`
          h-full border-r border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]
          transition-all duration-200 ease-out flex-shrink-0 overflow-hidden
          ${sidebarOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0'}
        `}
      >
        <div className="w-[260px] h-full overflow-y-auto">
          <Outlet />
        </div>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-[#141414]">
        <Outlet />
      </div>
    </div>
  );
};

export default BrMainLayout;
