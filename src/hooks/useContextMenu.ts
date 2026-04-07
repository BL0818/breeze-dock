import { useState, useCallback, useEffect } from 'react';
import type { ContextMenuItem } from '../types';

// ============================================================
// useContextMenu - 右键菜单 Hook
// ============================================================

interface ContextMenuState {
  /** 是否可见 */
  visible: boolean;
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 菜单项 */
  items: ContextMenuItem[];
}

/**
 * 右键菜单 Hook
 *
 * - 管理右键菜单的显示/隐藏和位置
 * - 返回事件处理函数和菜单状态
 * - 组件卸载时自动关闭
 *
 * @example
 * ```tsx
 * const { menuState, onContextMenu, closeMenu } = useContextMenu();
 *
 * <div onContextMenu={onContextMenu([
 *   { label: '编辑', onClick: () => handleEdit() },
 *   { label: '删除', onClick: () => handleDelete() },
 * ])}>
 *   内容区域
 * </div>
 *
 * <BrContextMenu {...menuState} onClose={closeMenu} />
 * ```
 */
export function useContextMenu() {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    items: [],
  });

  /** 关闭菜单 */
  const closeMenu = useCallback(() => {
    setMenuState((prev) => ({ ...prev, visible: false }));
  }, []);

  /** 打开右键菜单（高阶函数，接收菜单项配置） */
  const onContextMenu = useCallback(
    (items: ContextMenuItem[]) =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuState({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          items,
        });
      },
    [],
  );

  // 组件卸载关闭
  useEffect(() => {
    return () => {
      setMenuState((prev) => ({ ...prev, visible: false }));
    };
  }, []);

  return {
    /** 菜单状态 */
    menuState,
    /** 触发右键菜单 */
    onContextMenu,
    /** 关闭菜单 */
    closeMenu,
  };
}
