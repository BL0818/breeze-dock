import React from 'react';
import BrTitleBar from './BrTitleBar';
import BrSidebar from './BrSidebar';
import { useUIStore } from '../../stores/useUIStore';
import BrEditor from '../../features/editor/BrEditor';
import BrSearchBar from '../../features/search/BrSearchBar';
import BrTrashView from '../../features/trash/BrTrashView';
import BrSettingsPage from '../../features/settings/BrSettingsPage';
import NoteListView from '../../features/notes/NoteListView';
import BrCloseConfirmModal from './BrCloseConfirmModal';

// ============================================================
// BrWindowFrame - Linear 极简风格窗口框架
// 支持侧边栏展开/收起
// ============================================================

const BrWindowFrame: React.FC = () => {
  const currentView = useUIStore((s) => s.currentView);
  const searchOpen = useUIStore((s) => s.searchOpen);
  const closeConfirmModalOpen = useUIStore((s) => s.closeConfirmModalOpen);
  const closeCloseConfirmModal = useUIStore((s) => s.closeCloseConfirmModal);

  // 判断当前是否应该显示中间笔记列表
  const showNoteList = !searchOpen && currentView !== 'settings';

  const renderRightContent = () => {
    if (searchOpen) {
      return (
        <div className="flex-1 flex flex-col p-6 overflow-auto">
          <BrSearchBar />
        </div>
      );
    }

    switch (currentView) {
      case 'trash':
        return <BrTrashView />;
      case 'settings':
        return <BrSettingsPage />;
      default:
        return <BrEditor />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-white dark:bg-[#141414]">
      {/* 标题栏 */}
      <BrTitleBar />

      {/* 主体 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧导航栏 - 固定收起状态 48px */}
        <div className="w-12 h-full overflow-hidden flex-shrink-0">
          <BrSidebar />
        </div>

        {/* 分隔线 */}
        <div className="w-px flex-shrink-0 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)]" />

        {/* 中间笔记列表 - 固定宽度 */}
        {showNoteList && (
          <div className="w-[320px] flex-shrink-0 overflow-hidden border-r border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
            <NoteListView />
          </div>
        )}

        {/* 右侧内容区 - 编辑器或其他视图 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#141414]">
          {renderRightContent()}
        </div>
      </div>

      {/* 关闭确认弹窗 */}
      <BrCloseConfirmModal
        open={closeConfirmModalOpen}
        onOpenChange={closeCloseConfirmModal}
      />
    </div>
  );
};

export default BrWindowFrame;
