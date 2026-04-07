// ============================================================
// BrFloatingCard - Linear 极简风格悬浮卡片组件
// 功能：毛玻璃效果、无边框、可拖拽、透明度调节、鼠标穿透、贴边收起
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { FloatingConfig, Note } from '../../types';
import {
  GripVertical,
  Eye,
  EyeOff,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

// 贴边收起触发条宽度
const DOCK_TRIGGER_WIDTH = 10;
// 收起延迟（毫秒）
const DOCK_HIDE_DELAY = 300;

export interface BrFloatingCardProps {
  config: FloatingConfig;
  onClose: () => void;
  note?: Note;
  onUpdate?: (updates: Partial<Pick<Note, 'title' | 'content'>>) => void;
  /** 配置更新回调（用于透明度、穿透等配置变化） */
  onConfigUpdate?: (updates: Partial<FloatingConfig>) => void;
  /** 独立窗口模式：填满父容器，禁用拖拽/缩放（由 Tauri 窗口控制） */
  standalone?: boolean;
}

type DockSide = 'left' | null;

export const BrFloatingCard: React.FC<BrFloatingCardProps> = ({ config, onClose, note, onUpdate, onConfigUpdate, standalone }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: config.x, y: config.y });
  const [size, setSize] = useState({ width: config.width, height: config.height });
  const [localContent, setLocalContent] = useState(note?.content || '');

  // 内容区域透明度（独立于窗口透明度，用于控制内容区域的视觉透明度）
  // 透明度调节直接作用于窗口透明度
  const [contentOpacity, setContentOpacity] = useState(1.0);

  // 同步外部透明度变化
  useEffect(() => {
    // 外部 config.opacity 变化时，更新本地透明度
    setContentOpacity(config.opacity);
  }, [config.opacity]);

  // 贴边收起相关状态
  const [isDocked, setIsDocked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // 贴边后是否展开
  const [dockSide, setDockSide] = useState<DockSide>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 原始位置和大小（用于取消贴边时恢复）
  const originalPosRef = useRef({ x: config.x, y: config.y });
  const originalSizeRef = useRef({ width: config.width, height: config.height });

  // 同步外部笔记内容变化
  useEffect(() => {
    if (note?.content !== undefined) {
      setLocalContent(note.content);
    }
  }, [note?.content]);

  // 同步外部配置变化
  useEffect(() => {
    setPosition({ x: config.x, y: config.y });
    originalPosRef.current = { x: config.x, y: config.y };
  }, [config.x, config.y]);

  useEffect(() => {
    setSize({ width: config.width, height: config.height });
    originalSizeRef.current = { width: config.width, height: config.height };
  }, [config.width, config.height]);

  // 贴边收起
  const handleDock = useCallback(async (_side: DockSide) => {
    if (!standalone) return;

    try {
      const label = (await getCurrentWindow()).label;

      if (isDocked) {
        // 取消贴边，恢复原始位置和大小
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        await invoke('undock_floating_window', {
          label,
          originalX: originalPosRef.current.x,
          originalY: originalPosRef.current.y,
          originalWidth: originalSizeRef.current.width,
          originalHeight: originalSizeRef.current.height,
        });
        setIsDocked(false);
        setDockSide(null);
        setIsExpanded(true);
        setPosition({ x: originalPosRef.current.x, y: originalPosRef.current.y });
        setSize({ width: originalSizeRef.current.width, height: originalSizeRef.current.height });
      } else {
        // 贴边收起 - 调用 Tauri 设置窗口为触发条宽度
        await invoke('dock_floating_window', {
          label,
          dockSide: 'left',
          windowHeight: originalSizeRef.current.height,
          windowY: originalPosRef.current.y,
        });
        setIsDocked(true);
        setDockSide('left');
        setIsExpanded(false);
      }
    } catch (e) {
      console.error('贴边操作失败:', e);
    }
  }, [standalone, isDocked]);

  // 鼠标进入触发条 - 展开窗口
  const handleTriggerEnter = useCallback(async () => {
    if (!isDocked) return;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // 调用 Tauri 恢复窗口位置和大小
    try {
      const label = (await getCurrentWindow()).label;
      await invoke('undock_floating_window', {
        label,
        originalX: originalPosRef.current.x,
        originalY: originalPosRef.current.y,
        originalWidth: originalSizeRef.current.width,
        originalHeight: originalSizeRef.current.height,
      });
      setIsExpanded(true);
    } catch (e) {
      console.error('展开窗口失败:', e);
    }
  }, [isDocked]);

  // 鼠标离开触发条 - 不要自动收起，等待鼠标进入窗口
  const handleTriggerLeave = useCallback(() => {
    // 不做任何操作，auto-collapse 由 handleMouseLeave 处理
  }, []);

  // 鼠标离开窗口 - 如果是贴边状态则自动收起
  const handleMouseLeave = useCallback(() => {
    if (!isDocked || !isExpanded) return;

    hideTimeoutRef.current = setTimeout(async () => {
      // 重新贴边收起
      try {
        const label = (await getCurrentWindow()).label;
        await invoke('dock_floating_window', {
          label,
          dockSide: dockSide || 'left',
          windowHeight: originalSizeRef.current.height,
          windowY: originalPosRef.current.y,
        });
        setIsExpanded(false);
      } catch (e) {
        console.error('收起窗口失败:', e);
      }
    }, DOCK_HIDE_DELAY);
  }, [isDocked, isExpanded, dockSide]);

  // 鼠标进入窗口
  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // 拖拽处理
  const handleDragStart = useCallback(
    async (e: React.MouseEvent) => {
      if (config.isPenetrable) return;
      e.preventDefault();

      // 如果贴边了，先取消贴边
      if (isDocked) {
        try {
          const label = (await getCurrentWindow()).label;
          await invoke('undock_floating_window', {
            label,
            originalX: originalPosRef.current.x,
            originalY: originalPosRef.current.y,
            originalWidth: originalSizeRef.current.width,
            originalHeight: originalSizeRef.current.height,
          });
          setIsDocked(false);
          setDockSide(null);
          setPosition({ x: originalPosRef.current.x, y: originalPosRef.current.y });
          setSize({ width: originalSizeRef.current.width, height: originalSizeRef.current.height });
        } catch (e) {
          console.error('取消贴边失败:', e);
        }
      }

      if (standalone) {
        try {
          const win = getCurrentWindow();
          await win.startDragging();
        } catch {
          setIsDragging(true);
          dragStart.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
          };
        }
      } else {
        setIsDragging(true);
        dragStart.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
      }
    },
    [config.isPenetrable, position, standalone, isDocked],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onUpdate?.({ title: note?.title, content: note?.content });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position, note, onUpdate]);

  // 缩放处理
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // 清除 auto-collapse timeout，防止调整大小时窗口被收起
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setIsResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
      };
    },
    [size],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.current.x;
      const deltaY = e.clientY - resizeStart.current.y;
      setSize({
        width: Math.max(200, resizeStart.current.width + deltaX),
        height: Math.max(150, resizeStart.current.height + deltaY),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 透明度调节（调节窗口透明度，影响整体）
  const handleOpacityChange = useCallback(
    async (value: number[]) => {
      const newOpacity = Math.max(0.2, Math.min(1, value[0] / 100));

      // 如果是独立窗口，通过后端更新
      if (standalone) {
        const label = (await getCurrentWindow()).label;
        try {
          await invoke('update_floating_config', {
            label,
            title: null,
            width: null,
            height: null,
            x: null,
            y: null,
            always_on_top: true,
            transparent: true,
            opacity: newOpacity,
            skip_taskbar: true,
            resizable: true,
            decorations: false,
          });
        } catch (e) {
          console.error('更新透明度失败:', e);
        }
      }

      // 更新本地状态
      setContentOpacity(newOpacity);

      // 通知父组件更新配置（触发重新渲染和 localStorage 同步）
      onConfigUpdate?.({ opacity: newOpacity });
    },
    [onConfigUpdate, standalone],
  );

  // 切换鼠标穿透
  const handleTogglePenetrable = useCallback(async () => {
    const newPenetrable = !config.isPenetrable;

    // 如果是独立窗口，通过后端切换
    if (standalone) {
      const label = (await getCurrentWindow()).label;
      try {
        await invoke('toggle_penetration', { label, enabled: newPenetrable });
      } catch (e) {
        console.error('切换鼠标穿透失败:', e);
      }
    }

    // 通知父组件更新配置（触发重新渲染和 localStorage 同步）
    onConfigUpdate?.({ isPenetrable: newPenetrable });
  }, [config, onConfigUpdate, standalone]);

  // 切换折叠
  const handleToggleCollapse = useCallback(() => {
    // 通知外部更新折叠状态
  }, []);

  // 内容编辑（带防抖保存）
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setLocalContent(newContent);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onUpdate?.({ title: note?.title, content: newContent });
      }, 500);
    },
    [note?.title, onUpdate],
  );

  if (!note) return null;

  // 计算贴边收起时的触发条样式
  const getTriggerStyle = (): React.CSSProperties => {
    if (!isDocked || !dockSide) return {};

    return {
      position: 'fixed',
      zIndex: 2147483647,
    };
  };

  // 渲染触发条（贴边左侧时显示）
  const renderTrigger = () => {
    if (!isDocked || isExpanded) return null;

    const triggerStyle = { left: 0, top: originalPosRef.current.y, width: DOCK_TRIGGER_WIDTH, height: originalSizeRef.current.height };

    return (
      <div
        style={{ ...getTriggerStyle(), ...triggerStyle }}
        className={cn(
          'bg-white/95 dark:bg-[#1F1F1F]/95 backdrop-blur-xl',
          'border border-white/30 dark:border-white/10',
          'shadow-lg',
          'cursor-pointer hover:bg-white dark:hover:bg-[#1F1F1F]',
          'transition-all duration-300 ease-out'
        )}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
      >
        <div className="w-full h-full flex items-center justify-center">
          <GripVertical className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 贴边触发条 */}
      {renderTrigger()}

      {/* 主悬浮卡片 - 两层设计 */}
      <div
        ref={cardRef}
        className={cn(
          standalone
            ? 'relative w-full h-full rounded-none'
            : 'fixed rounded-lg overflow-hidden',
          !standalone && isDragging && 'cursor-grabbing',
        )}
        style={standalone ? {
          zIndex: 50,
        } : {
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          zIndex: 50,
          transition: 'transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transform: isDocked ? 'scale(0.98)' : 'scale(1)',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* ==================== 工具栏区域（固定、不受影响） ==================== */}
        {/* 工具栏：始终正常显示、可点击、不受穿透和透明影响 */}
        <div
          className={cn(
            'group absolute top-0 left-0 right-0 h-[44px] z-10',
            'bg-white/95 dark:bg-[#1F1F1F]/95',
            'backdrop-blur-md',
            'border-b border-black/5 dark:border-white/5',
            'flex items-center justify-between px-3 select-none',
            'shadow-sm'
          )}
          style={{
            // 工具栏不受内容透明度影响，保持完全不透明
          }}
        >
          {/* 左侧 - 拖拽指示器 + 标题 */}
          <div
            onMouseDown={handleDragStart}
            className="flex items-center gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing"
          >
            <GripVertical
              className={cn(
                'w-3.5 h-3.5 text-gray-400 transition-colors',
                isDragging && 'text-gray-600'
              )}
            />
            <span className="text-[13px] font-medium text-gray-800 dark:text-gray-100 truncate">
              {note.title || '无标题笔记'}
            </span>
          </div>

          {/* 右侧 - 控制按钮（始终可点击） */}
          <div className="no-drag flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
            {/* 贴边左侧按钮 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleDock('left')}
                    className={cn(
                      'w-6 h-6 flex items-center justify-center rounded transition-all duration-150',
                      isDocked
                        ? 'text-[#165DFF] bg-[#165DFF]/10'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                    )}
                  >
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4}>
                  {isDocked ? '取消贴边' : '贴边左侧'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* 鼠标穿透开关 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleTogglePenetrable}
                    className={cn(
                      'w-6 h-6 flex items-center justify-center rounded transition-all duration-150',
                      config.isPenetrable
                        ? 'text-[#165DFF] bg-[#165DFF]/10 hover:bg-[#165DFF]/20'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                    )}
                  >
                    {config.isPenetrable ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4}>
                  {config.isPenetrable ? '关闭鼠标穿透' : '开启鼠标穿透'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* 透明度调节（Hover 时弹出 HoverCard） */}
            <HoverCard>
              <HoverCardTrigger asChild>
                <button
                  className={cn(
                    'w-6 h-6 flex items-center justify-center rounded transition-all duration-150',
                    'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50',
                    // HoverCard 打开时的高亮样式（通过 CSS 实现）
                    'group-hover:text-[#165DFF] group-hover:bg-[#165DFF]/10'
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent
                side="bottom"
                sideOffset={8}
                className="w-64 p-3 bg-white/95 dark:bg-[#1F1F1F]/95 backdrop-blur-md rounded-lg shadow-lg border border-black/5 dark:border-white/10"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="space-y-2">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    透明度
                  </div>
                  <Slider
                    value={[Math.round(contentOpacity * 100)]}
                    onValueChange={handleOpacityChange}
                    min={20}
                    max={100}
                    step={5}
                    className="w-full h-1.5"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
                    <span>20%</span>
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {Math.round(contentOpacity * 100)}%
                    </span>
                    <span>100%</span>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>

            {/* 关闭按钮 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onClose}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50/50 transition-all duration-150"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4}>
                  关闭
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* ==================== 内容区域（可穿透、可透明） ==================== */}
        {/* 内容区：支持鼠标穿透、可调节透明度、有毛玻璃效果 */}
        <div
          className={cn(
            'absolute top-[44px] left-0 right-0 bottom-0',
            'flex flex-col',
            // 穿透模式：内容区 pointer-events none
            config.isPenetrable && 'pointer-events-none',
          )}
          style={{
            // 内容区透明度由 contentOpacity 控制
            opacity: contentOpacity,
            transition: 'opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            // 毛玻璃效果
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* 笔记内容 - 使用 overflow-hidden 隐藏滚动条 */}
          <div className="flex-1 overflow-hidden p-4 bg-white/40 dark:bg-black/20">
            <textarea
              value={localContent}
              onChange={handleContentChange}
              className={cn(
                'w-full h-full resize-none outline-none',
                'text-[14px] leading-relaxed text-gray-800 dark:text-gray-100',
                'bg-transparent',
                'placeholder:text-gray-400'
              )}
              placeholder="在此记录您的想法..."
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            />
          </div>

          {/* 缩放手柄 */}
          <div
            onMouseDown={handleResizeStart}
            className={cn(
              'absolute bottom-0 right-0 w-4 h-4 cursor-se-resize',
              'flex items-end justify-end p-0.5',
              'opacity-0 hover:opacity-100 transition-opacity',
              isResizing && 'opacity-100'
            )}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              className="text-gray-400"
            >
              <path
                d="M1 7L7 1M4 7L7 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* 折叠时仅显示图标 */}
        {config.isCollapsed && (
          <div
            className={cn(
              'absolute top-0 left-0 right-0 bottom-0',
              'bg-white/95 dark:bg-[#1F1F1F]/95',
              'backdrop-blur-md',
              'flex items-center justify-center',
              'pointer-events-auto'
            )}
          >
            <button
              onClick={handleToggleCollapse}
              className="w-full h-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default BrFloatingCard;
