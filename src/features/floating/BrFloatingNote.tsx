import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNoteStore } from '../../stores/useNoteStore';
import { useUIStore } from '../../stores/useUIStore';
import type { FloatingConfig, FloatingSecurityState } from '../../types';
import { ChevronDown, ChevronUp, Hand, X, Lock, Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { invoke } from '@tauri-apps/api/core';

// ============================================================
// BrFloatingNote - Linear 极简风格悬浮笔记卡片
// 支持浮窗锁定、无痕模式、安全保护
// ============================================================

export interface BrFloatingNoteProps {
  config: FloatingConfig;
}

const BrFloatingNote: React.FC<BrFloatingNoteProps> = ({ config }) => {
  const notes = useNoteStore((s) => s.notes);
  const updateNote = useNoteStore((s) => s.updateNote);
  const updateFloating = useUIStore((s) => s.updateFloating);
  const removeFloating = useUIStore((s) => s.removeFloating);

  const [position, setPosition] = useState({ x: config.x, y: config.y });
  const [isDragging, setIsDragging] = useState(false);
  const [isLocked, setIsLocked] = useState(config.isLocked ?? false);
  const [showUnlockOverlay, setShowUnlockOverlay] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [isIncognito, setIsIncognito] = useState(config.isIncognito ?? false);
  const dragStart = useRef({ x: 0, y: 0 });

  const note = notes.find((n) => n.id === config.noteId);
  const label = config.label ?? `floating-${config.noteId}`;

  // 检查浮窗安全状态
  useEffect(() => {
    const checkSecurityState = async () => {
      try {
        const state = await invoke<FloatingSecurityState>('get_floating_security_state', { label });
        setIsLocked(state.isLocked);
        setIsIncognito(state.isIncognito);
      } catch (e) {
        console.error('[BrFloatingNote] 获取安全状态失败:', e);
      }
    };
    checkSecurityState();
  }, [label]);

  // Esc 键锁定浮窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLocked) {
        handleLock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (config.isPenetrable || isLocked) return;
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [config.isPenetrable, isLocked, position],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      updateFloating(config.noteId, {
        x: position.x,
        y: position.y,
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, config.noteId, position, updateFloating]);

  const handleOpacityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateFloating(config.noteId, { opacity: parseFloat(e.target.value) });
    },
    [config.noteId, updateFloating],
  );

  const handleTogglePenetrable = useCallback(() => {
    updateFloating(config.noteId, { isPenetrable: !config.isPenetrable });
  }, [config.noteId, config.isPenetrable, updateFloating]);

  const handleToggleCollapse = useCallback(() => {
    updateFloating(config.noteId, { isCollapsed: !config.isCollapsed });
  }, [config.noteId, config.isCollapsed, updateFloating]);

  // 锁定浮窗
  const handleLock = useCallback(async () => {
    try {
      await invoke('lock_floating', { label });
      setIsLocked(true);
      setShowUnlockOverlay(false);
    } catch (e) {
      console.error('[BrFloatingNote] 锁定失败:', e);
    }
  }, [label]);

  // 解锁浮窗
  const handleUnlock = useCallback(async () => {
    try {
      const success = await invoke<boolean>('unlock_floating', { label, password: unlockPassword });
      if (success) {
        setIsLocked(false);
        setShowUnlockOverlay(false);
        setUnlockPassword('');
        setUnlockError(false);
      } else {
        setUnlockError(true);
      }
    } catch (e) {
      console.error('[BrFloatingNote] 解锁失败:', e);
      setUnlockError(true);
    }
  }, [label, unlockPassword]);

  // 关闭浮窗
  const handleClose = useCallback(async () => {
    if (isIncognito) {
      // 无痕模式：直接销毁，不保存任何数据
      try {
        await invoke('close_incognito_floating', { label });
      } catch (e) {
        console.error('[BrFloatingNote] 关闭无痕浮窗失败:', e);
      }
    } else {
      // 普通模式：先保存配置，再关闭
      removeFloating(config.noteId);
    }
  }, [config.noteId, isIncognito, label, removeFloating]);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!note || isLocked) return;
      updateNote(note.id, { content: e.target.value });
    },
    [note, isLocked, updateNote],
  );

  if (!note) return null;

  // 锁定时的解锁覆盖层
  const renderUnlockOverlay = () => (
    <div className="absolute inset-0 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-lg">
      <Lock className="w-8 h-8 text-gray-400 mb-3" />
      <p className="text-[13px] text-gray-600 dark:text-gray-300 mb-4">浮窗已锁定</p>
      <div className="w-48">
        <input
          type="password"
          value={unlockPassword}
          onChange={(e) => {
            setUnlockPassword(e.target.value);
            setUnlockError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleUnlock();
          }}
          placeholder="输入密码解锁"
          className={`w-full px-3 py-2 text-[13px] rounded-md border ${
            unlockError
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-200 dark:border-gray-700 focus:ring-[var(--color-primary)]'
          } bg-white dark:bg-[#1F1F1F] text-gray-900 dark:text-gray-100 outline-none focus:ring-1`}
          autoFocus
        />
        {unlockError && (
          <p className="text-[11px] text-red-500 mt-1">密码错误，请重试</p>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleUnlock}
          className="px-4 py-1.5 text-[12px] rounded-md bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
        >
          解锁
        </button>
        <button
          onClick={() => {
            setShowUnlockOverlay(false);
            setUnlockPassword('');
            setUnlockError(false);
          }}
          className="px-4 py-1.5 text-[12px] rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`
        fixed z-50 bg-white dark:bg-[#141414] rounded-lg shadow-lg border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]
        flex flex-col overflow-hidden transition-opacity duration-150
        ${config.isPenetrable ? 'pointer-events-none' : ''}
        ${isDragging ? 'cursor-grabbing' : ''}
        ${isLocked ? 'cursor-default' : ''}
      `}
      style={{
        left: position.x,
        top: position.y,
        width: config.width,
        height: config.isCollapsed ? 'auto' : config.height,
        opacity: config.opacity,
      }}
    >
      {/* 标题栏 */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-3 py-2 bg-white/50 dark:bg-[#141414]/50 cursor-grab select-none border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* 无痕模式指示器 */}
          {isIncognito && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Eye className="w-3 h-3 text-gray-400 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4}>
                  无痕模式
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100 truncate">
            {note.title || '无标题'}
          </span>
        </div>
        <div className="flex items-center gap-0.5 ml-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggleCollapse}
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] transition-colors"
                >
                  {config.isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                {config.isCollapsed ? '展开' : '收起'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleTogglePenetrable}
                  className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${config.isPenetrable ? 'text-[var(--color-primary)] bg-[var(--color-primary-subtle)]' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A]'}`}
                >
                  <Hand className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                {config.isPenetrable ? '关闭鼠标穿透' : '开启鼠标穿透'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* 锁定按钮 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (isLocked) {
                      setShowUnlockOverlay(true);
                    } else {
                      handleLock();
                    }
                  }}
                  className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${isLocked ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A]'}`}
                >
                  {isLocked ? <EyeOff className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                {isLocked ? '解锁浮窗' : '锁定浮窗'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleClose}
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                {isIncognito ? '销毁' : '关闭'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* 内容区 */}
      {!config.isCollapsed && (
        <>
          <div className="flex-1 relative">
            {/* 锁定覆盖层 */}
            {isLocked && showUnlockOverlay && renderUnlockOverlay()}
            {isLocked && !showUnlockOverlay && (
              <div
                onClick={() => setShowUnlockOverlay(true)}
                className="absolute inset-0 bg-gray-50/50 dark:bg-gray-900/50 cursor-pointer z-40 flex items-center justify-center"
              >
                <div className="flex flex-col items-center">
                  <Lock className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-[12px] text-gray-500">点击解锁</span>
                </div>
              </div>
            )}
            <textarea
              value={note.content}
              onChange={handleContentChange}
              readOnly={isLocked}
              className={`flex-1 w-full p-3 bg-transparent text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none resize-none ${isLocked ? 'cursor-pointer' : ''}`}
              placeholder="记录..."
            />
          </div>

          {/* 底部控制 */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
            <span className="text-[10px] text-gray-400">透明度</span>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={config.opacity}
              onChange={handleOpacityChange}
              className="flex-1 h-1 accent-[var(--color-primary)]"
            />
            <span className="text-[10px] text-gray-400 w-8 text-right">
              {Math.round(config.opacity * 100)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default BrFloatingNote;
