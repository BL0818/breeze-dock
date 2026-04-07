import React, { useCallback } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { splitTextWithLinks } from './BrLinkDetector';
import type { TextSegment } from './BrLinkDetector';
import { BrContextMenu } from '@/components/ui/BrContextMenu';
import type { ContextMenuItem } from '@/types';

// ============================================================
// BrAutoLink - URL 自动检测和渲染组件
// Linear 极简风格链接样式
// ============================================================

interface BrAutoLinkProps {
  text: string;
  className?: string;
}

const BrAutoLink: React.FC<BrAutoLinkProps> = ({ text, className = '' }) => {
  const [contextMenu, setContextMenu] = React.useState({
    visible: false,
    x: 0,
    y: 0,
    link: '',
  });

  // 使用 splitTextWithLinks 分割文本
  const segments = splitTextWithLinks(text);

  // 在浏览器中打开链接
  const handleLinkClick = useCallback(async (url: string) => {
    try {
      await open(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  }, []);

  // Ctrl+Click / Cmd+Click 打开链接
  const handleClick = useCallback(
    (e: React.MouseEvent, url: string) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleLinkClick(url);
      }
    },
    [handleLinkClick]
  );

  // 右键菜单
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, url: string) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        link: url,
      });
    },
    []
  );

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // 复制链接
  const handleCopyLink = useCallback(() => {
    if (contextMenu.link) {
      navigator.clipboard.writeText(contextMenu.link);
    }
    closeContextMenu();
  }, [contextMenu.link, closeContextMenu]);

  // 右键菜单项
  const contextMenuItems: ContextMenuItem[] = [
    {
      label: '复制链接',
      icon: 'copy',
      shortcut: '',
      onClick: handleCopyLink,
    },
  ];

  // 渲染片段
  const renderSegments = () => {
    return segments.map((segment: TextSegment, index: number) => {
      if (segment.type === 'link') {
        return (
          <a
            key={index}
            href={segment.content}
            onClick={(e) => handleClick(e, segment.content)}
            onContextMenu={(e) => handleContextMenu(e, segment.content)}
            className="text-[var(--color-primary)] underline underline-offset-2 hover:text-[var(--color-primary-hover)] transition-colors cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            {segment.content}
          </a>
        );
      }

      return (
        <span key={index} className="whitespace-pre-wrap">
          {segment.content}
        </span>
      );
    });
  };

  return (
    <>
      <div className={`break-words ${className}`}>{renderSegments()}</div>

      {/* 右键菜单 */}
      <BrContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextMenuItems}
        onClose={closeContextMenu}
      />
    </>
  );
};

export default BrAutoLink;
