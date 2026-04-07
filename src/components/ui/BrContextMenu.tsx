import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, Copy, Scissors, Clipboard, Calendar, Tag, Folder, Star, Archive, Trash2, MoreHorizontal } from 'lucide-react';
import type { ContextMenuItem } from '@/types';

// ============================================================
// BrContextMenu - Linear 极简风格右键菜单
// 特性：多级子菜单、快捷键提示、禁用状态、分隔线、ESC关闭
// ============================================================

interface BrContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

// 递归渲染菜单项
interface MenuItemProps {
  item: ContextMenuItem;
  depth?: number;
  onItemClick: (item: ContextMenuItem) => void;
  onSubmenuOpen: (item: ContextMenuItem, x: number, y: number) => void;
  onSubmenuClose: () => void;
}

const MenuItemComponent: React.FC<MenuItemProps> = ({ item, depth = 0, onItemClick, onSubmenuOpen, onSubmenuClose }) => {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [submenuPos, setSubmenuPos] = useState({ x: 0, y: 0 });
  const itemRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback((_e: React.MouseEvent) => {
    if (item.disabled || !item.children?.length) return;
    const rect = itemRef.current?.getBoundingClientRect();
    if (rect) {
      setSubmenuPos({ x: rect.right, y: rect.top });
      setSubmenuOpen(true);
      onSubmenuOpen(item, rect.right, rect.top);
    }
  }, [item.disabled, item.children, onSubmenuOpen]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!itemRef.current?.contains(relatedTarget)) {
      setSubmenuOpen(false);
      onSubmenuClose();
    }
  }, [onSubmenuClose]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.disabled) return;
    if (item.children?.length) {
      const rect = itemRef.current?.getBoundingClientRect();
      if (rect) {
        setSubmenuPos({ x: rect.right, y: rect.top });
        setSubmenuOpen(true);
        onSubmenuOpen(item, rect.right, rect.top);
      }
    } else {
      onItemClick(item);
    }
  }, [item, onItemClick, onSubmenuOpen]);

  // 获取图标组件
  const getIcon = (iconName?: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      copy: <Copy className="w-3.5 h-3.5" />,
      cut: <Scissors className="w-3.5 h-3.5" />,
      paste: <Clipboard className="w-3.5 h-3.5" />,
      calendar: <Calendar className="w-3.5 h-3.5" />,
      tag: <Tag className="w-3.5 h-3.5" />,
      folder: <Folder className="w-3.5 h-3.5" />,
      star: <Star className="w-3.5 h-3.5" />,
      archive: <Archive className="w-3.5 h-3.5" />,
      trash: <Trash2 className="w-3.5 h-3.5" />,
      more: <MoreHorizontal className="w-3.5 h-3.5" />,
    };
    return iconName ? iconMap[iconName] : null;
  };

  if (item.divider) {
    return (
      <div className="h-px bg-[#e5e5e5] dark:bg-[#2e2e2e] my-1 mx-1" />
    );
  }

  return (
    <div
      ref={itemRef}
      className={cn(
        'relative flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all duration-150',
        'text-[13px] text-[#111827] dark:text-[#e5e5e5]',
        item.disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-[#f5f5f5] dark:hover:bg-[#2e2e2e]',
        depth > 0 && 'pl-6'
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 图标 */}
      {item.icon && (
        <span className="text-[#71717a] dark:text-[#a1a1aa] flex-shrink-0">
          {getIcon(item.icon)}
        </span>
      )}

      {/* 标签 */}
      <span className="flex-1 truncate">{item.label}</span>

      {/* 快捷键 */}
      {item.shortcut && (
        <span className="text-[11px] text-[#71717a] dark:text-[#71717a] font-medium ml-4">
          {item.shortcut}
        </span>
      )}

      {/* 子菜单箭头 */}
      {item.children && item.children.length > 0 && (
        <ChevronRight className="w-3 h-3 text-[#71717a] flex-shrink-0" />
      )}

      {/* 子菜单 */}
      {submenuOpen && item.children && item.children.length > 0 && (
        <div
          className="absolute left-full top-0 z-50"
          style={{ left: submenuPos.x, top: submenuPos.y }}
        >
          <div
            className={cn(
              'min-w-[160px] py-1 rounded-[8px] border border-[#e5e5e5] dark:border-[#2e2e2e]',
              'bg-white dark:bg-[#1a1a1a]',
              'shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
              'animate-in fade-in-0 zoom-in-95 duration-150 ease-in-out'
            )}
            onMouseEnter={() => setSubmenuOpen(true)}
            onMouseLeave={() => {
              setSubmenuOpen(false);
              onSubmenuClose();
            }}
          >
            {item.children.map((child, idx) => (
              <MenuItemComponent
                key={`${child.label}-${idx}`}
                item={child}
                depth={depth + 1}
                onItemClick={onItemClick}
                onSubmenuOpen={onSubmenuOpen}
                onSubmenuClose={onSubmenuClose}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 主组件
export const BrContextMenu: React.FC<BrContextMenuProps> = ({ visible, x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [_openSubmenu, setOpenSubmenu] = useState<ContextMenuItem | null>(null);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onClose]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      // 延迟添加监听，避免点击打开菜单时立即触发
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [visible, onClose]);

  // 调整菜单位置确保在视口内
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  useEffect(() => {
    if (!visible) return;

    const menuWidth = 200;
    const menuHeight = items.length * 32 + 16; // 估算高度
    const padding = 8;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = x;
    let newY = y;

    // 右侧超出
    if (x + menuWidth + padding > viewportWidth) {
      newX = viewportWidth - menuWidth - padding;
    }

    // 底部超出
    if (y + menuHeight + padding > viewportHeight) {
      newY = viewportHeight - menuHeight - padding;
    }

    // 左侧超出
    if (newX < padding) {
      newX = padding;
    }

    // 顶部超出
    if (newY < padding) {
      newY = padding;
    }

    setAdjustedPos({ x: newX, y: newY });
  }, [visible, x, y, items.length]);

  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (item.disabled) return;
    item.onClick?.();
    onClose();
  }, [onClose]);

  const handleSubmenuOpen = useCallback((item: ContextMenuItem, _subX: number, _subY: number) => {
    setOpenSubmenu(item);
  }, []);

  const handleSubmenuClose = useCallback(() => {
    setOpenSubmenu(null);
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-[9999] min-w-[180px] py-1 px-1 rounded-[8px]',
        'bg-white dark:bg-[#1a1a1a]',
        'border border-[#e5e5e5] dark:border-[#2e2e2e]',
        'shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
        'animate-in fade-in-0 zoom-in-95 duration-150 ease-in-out'
      )}
      style={{
        left: adjustedPos.x,
        top: adjustedPos.y,
      }}
    >
      {items.map((item, idx) => (
        <MenuItemComponent
          key={`${item.label}-${idx}`}
          item={item}
          depth={0}
          onItemClick={handleItemClick}
          onSubmenuOpen={handleSubmenuOpen}
          onSubmenuClose={handleSubmenuClose}
        />
      ))}
    </div>
  );
};

export default BrContextMenu;
