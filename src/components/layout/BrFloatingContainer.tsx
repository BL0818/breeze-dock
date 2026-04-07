// ============================================================
// BrFloatingContainer - 悬浮窗内容容器组件
// 功能：为 Tauri 独立悬浮窗提供内容渲染容器
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { BrFloatingCard } from '../../features/floating/BrFloatingCard';
import type { FloatingConfig, Note } from '../../types';

/**
 * 从窗口标签解析 noteId
 * 窗口标签格式：floating-{noteId}
 * 因 Tauri v2 的 WebviewUrl::App + 查询参数会导致 build() 挂起，
 * 故通过窗口标签而非 URL 参数传递 noteId。
 */
function useNoteIdFromLabel(): string | null {
  const [noteId, setNoteId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const label = getCurrentWindow().label;
      if (label.startsWith('floating-')) {
        setNoteId(label.slice('floating-'.length));
      }
    } catch {
      // 非 Tauri 环境
    }
  }, []);

  return noteId;
}

export const BrFloatingContainer: React.FC = () => {
  const noteId = useNoteIdFromLabel();
  const [config, setConfig] = useState<FloatingConfig | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  // 直接从数据库加载笔记数据（悬浮窗是独立实例，store 状态为空）
  const loadNote = useCallback(async (id: string) => {
    try {
      const result = await invoke<Note | null>('get_note', { id });
      setNote(result);
    } catch {
      setNote(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载笔记
  useEffect(() => {
    if (!noteId) {
      setLoading(false);
      return;
    }
    loadNote(noteId);
  }, [noteId, loadNote]);

  // 加载悬浮窗配置
  useEffect(() => {
    if (!noteId) {
      return;
    }

    const loadConfig = async () => {
      try {
        const saved = localStorage.getItem(`floating-config-${noteId}`);
        if (saved) {
          setConfig(JSON.parse(saved));
        } else {
          const savedConfig = await invoke<{ x: number; y: number; width: number; height: number; opacity: number } | null>(
            'get_floating_config_from_db',
            { noteId }
          );
          if (savedConfig) {
            setConfig({
              noteId,
              x: savedConfig.x,
              y: savedConfig.y,
              width: savedConfig.width,
              height: savedConfig.height,
              opacity: savedConfig.opacity,
              isPenetrable: false,
              isCollapsed: false,
            });
          } else {
            // 默认配置
            setConfig({
              noteId,
              x: 100,
              y: 100,
              width: 320,
              height: 400,
              opacity: 1,
              isPenetrable: false,
              isCollapsed: false,
            });
          }
        }
      } catch {
        setConfig({
          noteId,
          x: 100,
          y: 100,
          width: 320,
          height: 400,
          opacity: 1,
          isPenetrable: false,
          isCollapsed: false,
        });
      }
    };

    loadConfig();
  }, [noteId]);

  // 保存配置变化
  useEffect(() => {
    if (!config || !noteId) return;

    localStorage.setItem(`floating-config-${noteId}`, JSON.stringify(config));
  }, [config, noteId]);

  // 更新悬浮窗配置（透明度、穿透等）
  const handleConfigUpdate = useCallback((updates: Partial<FloatingConfig>) => {
    if (!config || !noteId) return;
    setConfig({ ...config, ...updates });
  }, [config, noteId]);

  // 更新笔记内容（保存到后端）
  const handleNoteUpdate = useCallback(async (updates: Partial<Pick<Note, 'title' | 'content'>>) => {
    if (!noteId) return;
    try {
      await invoke('update_note', { id: noteId, ...updates });
      // 重新加载笔记以获取最新数据
      await loadNote(noteId);
    } catch {
      // 保存失败时静默处理
    }
  }, [noteId, loadNote]);

  // 关闭窗口
  const handleClose = async () => {
    const win = await getCurrentWindow();
    await win.close();
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-transparent">
        <span className="text-sm">正在加载...</span>
      </div>
    );
  }

  if (!note || !config) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-transparent">
        <span className="text-sm">笔记不存在</span>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-[#F7F8FA] dark:bg-[#141414]">
      <BrFloatingCard
        config={config}
        onClose={handleClose}
        note={note}
        onUpdate={handleNoteUpdate}
        onConfigUpdate={handleConfigUpdate}
        standalone
      />
    </div>
  );
};

export default BrFloatingContainer;
