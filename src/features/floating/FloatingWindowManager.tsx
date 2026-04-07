// ============================================================
// FloatingWindowManager - 悬浮窗管理器组件
// 功能：管理所有悬浮窗的渲染和状态同步
//
// 注意：此组件目前用于状态同步，实际悬浮窗内容由 BrFloatingContainer
// 在独立的 Tauri 窗口中渲染。
// ============================================================

import React, { useEffect } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useFloatingWindow } from '../../hooks/useFloatingWindow';

export const FloatingWindowManager: React.FC = () => {
  const floatingWindows = useUIStore((s) => s.floatingWindows);
  const removeFloating = useUIStore((s) => s.removeFloating);
  const { checkFloatingExists } = useFloatingWindow();

  // 同步悬浮窗状态 - 检查窗口是否还存在
  useEffect(() => {
    const syncWindows = async () => {
      for (const fw of floatingWindows) {
        const exists = await checkFloatingExists(fw.noteId);
        if (!exists) {
          // 窗口已关闭，从状态中移除
          removeFloating(fw.noteId);
        }
      }
    };

    // 每 2 秒同步一次
    const interval = setInterval(syncWindows, 2000);
    return () => clearInterval(interval);
  }, [floatingWindows, checkFloatingExists, removeFloating]);

  if (floatingWindows.length === 0) {
    return null;
  }

  // TODO: FloatingWindowManager 需要从 store 获取 note 数据才能渲染 BrFloatingCard
  // 暂时返回 null，避免编译错误。悬浮窗内容由 BrFloatingContainer 在独立窗口中渲染
  return null;
};
