import React, { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Maximize2, X, FileText, Pin } from 'lucide-react';
import { useSettingStore } from '../../stores/useSettingStore';
import { useUIStore } from '../../stores/useUIStore';

// ============================================================
// BrTitleBar - Linear 极简风格标题栏
// ============================================================

export const BrTitleBar: React.FC = () => {
  const [isPinned, setIsPinned] = useState(false);
  const { settings } = useSettingStore();
  const { openCloseConfirmModal } = useUIStore();

  const handleMinimize = () => getCurrentWindow().minimize();
  const handleMaximize = () => getCurrentWindow().toggleMaximize();

  const handleClose = () => {
    if (settings.confirmBeforeClose) {
      // 显示确认弹窗
      openCloseConfirmModal();
    } else if (settings.closeToTray) {
      // 直接最小化到托盘
      getCurrentWindow().hide();
    } else {
      // 直接退出
      getCurrentWindow().close();
    }
  };

  const handlePin = async () => {
    const newPinned = !isPinned;
    await getCurrentWindow().setAlwaysOnTop(newPinned);
    setIsPinned(newPinned);
  };

  return (
    <div
      className="h-11 border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[#141414] flex items-center justify-between select-none"
      data-tauri-drag-region
    >
      {/* 左侧 - Logo + 可拖拽区域 */}
      <div className="drag-region flex items-center px-4 gap-2" data-tauri-drag-region>
        <div className="w-6 h-6 rounded-md bg-[var(--color-primary)] flex items-center justify-center">
          <FileText className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
          BreezeDock
        </span>
      </div>

      {/* 右侧 - 窗口控制按钮 - Linear ghost 风格 */}
      <div className="no-drag flex items-center gap-0.5 pr-3">
        <button
          onClick={handleMinimize}
          className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={handleMaximize}
          className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handlePin}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150 ${
            isPinned
              ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-gray-700 dark:hover:text-gray-200'
          }`}
          title={isPinned ? '取消置顶' : '置顶'}
        >
          <Pin className={`w-4 h-4 ${isPinned ? 'rotate-45' : ''}`} />
        </button>

        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors duration-150"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BrTitleBar;
