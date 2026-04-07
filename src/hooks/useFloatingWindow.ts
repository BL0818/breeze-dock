// ============================================================
// useFloatingWindow - 悬浮窗管理 Hook
// 功能：创建/管理桌面悬浮窗，支持贴边自动收起、透明度调节、鼠标穿透
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useUIStore } from '../stores/useUIStore';
import type { Note, FloatingConfig } from '../types';

// 导出贴边检测配置
export const EDGE_THRESHOLD = 20; // 贴边检测阈值（像素）
export const AUTO_COLLAPSE_WIDTH = 48; // 收起后宽度
export const AUTO_COLLAPSE_HEIGHT = 48; // 收起后高度

export interface FloatingWindowOptions {
  note: Note;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
}

export interface UseFloatingWindowReturn {
  // 创建悬浮窗
  createFloatingWindow: (options: FloatingWindowOptions) => Promise<void>;
  // 关闭悬浮窗
  closeFloatingWindow: (noteId: string) => Promise<void>;
  // 更新悬浮窗配置
  updateFloatingWindow: (noteId: string, updates: Partial<FloatingConfig>) => Promise<void>;
  // 设置透明度
  setWindowOpacity: (noteId: string, opacity: number) => Promise<void>;
  // 切换鼠标穿透
  toggleMousePenetration: (noteId: string, enabled: boolean) => Promise<void>;
  // 检查悬浮窗是否存在
  checkFloatingExists: (noteId: string) => Promise<boolean>;
  // 从数据库加载配置
  loadConfigFromDb: (noteId: string) => Promise<Partial<FloatingConfig> | null>;
  // 保存配置到数据库
  saveConfigToDb: (noteId: string, config: Partial<FloatingConfig>) => Promise<void>;
  // 贴边检测
  checkEdgeSnap: (x: number, y: number, width: number, height: number) => EdgePosition | null;
  // 获取贴边后的位置
  getSnappedPosition: (edge: EdgePosition, width: number, height: number) => { x: number; y: number };
}

export type EdgePosition = 'left' | 'right' | 'top' | 'bottom' | null;

export function useFloatingWindow(): UseFloatingWindowReturn {
  const addFloating = useUIStore((s) => s.addFloating);
  const removeFloating = useUIStore((s) => s.removeFloating);
  const updateFloating = useUIStore((s) => s.updateFloating);
  const floatingWindows = useUIStore((s) => s.floatingWindows);

  // 创建悬浮窗
  const createFloatingWindow = useCallback(async (options: FloatingWindowOptions) => {
    const { note, x = 100, y = 100, width = 320, height = 400, opacity = 1 } = options;

    // 检查是否已存在
    const existing = floatingWindows.find((w) => w.noteId === note.id);
    if (existing) return;

    const label = `floating-${note.id}`;

    // 清理 store 中可能残留的过期条目
    const storeExisting = floatingWindows.find((w) => w.noteId === note.id);
    if (storeExisting) {
      removeFloating(note.id);
    }
    let finalX = x;
    let finalY = y;
    let finalWidth = width;
    let finalHeight = height;
    let finalOpacity = opacity;

    try {
      const savedConfig = await invoke<Partial<FloatingConfig> | null>('get_floating_config_from_db', {
        noteId: note.id,
      });

      if (savedConfig) {
        finalX = savedConfig.x ?? x;
        finalY = savedConfig.y ?? y;
        finalWidth = savedConfig.width ?? width;
        finalHeight = savedConfig.height ?? height;
        finalOpacity = savedConfig.opacity ?? opacity;
      }
    } catch {
      // 没有已保存的配置，使用默认值
    }

    try {
      // 使用前端 WebviewWindow API 创建窗口（绕过 Rust 端 URL 解析问题）
      // Tauri v2 在 Windows 上 Rust 端 WebviewWindowBuilder 创建的窗口无法加载 SPA 内容
      const webview = new WebviewWindow(label, {
        url: '/',  // 前端 API 会正确解析为 dev server 或 bundled asset
        title: note.title || '悬浮笔记',
        width: finalWidth,
        height: finalHeight,
        x: finalX,
        y: finalY,
        alwaysOnTop: true,
        resizable: true,
        // 注意：不设置 decorations/skipTaskbar，这些在 Windows 上会导致挂起
      });

      // 监听窗口创建结果
      webview.once('tauri://created', async () => {
        // 创建成功后移除原生标题栏（不能在构造函数中设置，会挂起）
        try {
          await webview.setDecorations(false);
        } catch {
          // 移除标题栏失败时静默处理
        }
      });

      // 监听窗口关闭事件，自动清理 store
      webview.onCloseRequested(() => {
        removeFloating(note.id);
      });

      // 保存配置到数据库
      try {
        await invoke('save_floating_config', {
          note_id: note.id,
          label,
          x: finalX,
          y: finalY,
          width: finalWidth,
          height: finalHeight,
          opacity: finalOpacity,
          is_penetrable: false,
          is_collapsed: false,
        });
      } catch {
        // 保存配置失败时静默处理
      }

      // 添加到前端状态
      const config: FloatingConfig = {
        noteId: note.id,
        x: finalX,
        y: finalY,
        width: finalWidth,
        height: finalHeight,
        opacity: finalOpacity,
        isPenetrable: false,
        isCollapsed: false,
      };
      addFloating(config);
    } catch (error: any) {
      // 如果是标签冲突（窗口已存在），尝试销毁旧窗口后重试
      if (String(error).includes('already exists') || String(error).includes('Window')) {
        try {
          const old = await WebviewWindow.getByLabel(label);
          if (old) await old.destroy();
        } catch {}
        // 不重试，让用户再次点击创建
      }
      // 即使 invoke 失败，也添加临时配置到 store，以便关闭功能可以工作
      const tempConfig: FloatingConfig = {
        noteId: note.id,
        x: finalX,
        y: finalY,
        width: finalWidth,
        height: finalHeight,
        opacity: finalOpacity,
        isPenetrable: false,
        isCollapsed: false,
      };
      addFloating(tempConfig);
    }
  }, [addFloating, floatingWindows]);

  // 关闭悬浮窗
  const closeFloatingWindow = useCallback(async (noteId: string) => {
    const label = `floating-${noteId}`;

    try {
      const existingWin = await WebviewWindow.getByLabel(label);
      if (existingWin) {
        await existingWin.close();
      }
      removeFloating(noteId);
    } catch (error) {
      removeFloating(noteId);
      throw error;
    }
  }, [removeFloating]);

  // 保存配置到数据库的辅助函数
  const saveConfigToDb = useCallback(async (noteId: string, config: Partial<FloatingConfig>) => {
    try {
      const label = `floating-${noteId}`;
      await invoke('save_floating_config', {
        note_id: noteId,
        label,
        x: config.x ?? 100,
        y: config.y ?? 100,
        width: config.width ?? 320,
        height: config.height ?? 400,
        opacity: config.opacity ?? 1,
        is_penetrable: config.isPenetrable ?? false,
        is_collapsed: config.isCollapsed ?? false,
      });
    } catch {
      // 保存失败时静默处理
    }
  }, []);

  // 更新悬浮窗配置
  const updateFloatingWindow = useCallback(async (noteId: string, updates: Partial<FloatingConfig>) => {
    const label = `floating-${noteId}`;
    const existing = floatingWindows.find((w) => w.noteId === noteId);
    if (!existing) return;

    const config = { ...existing, ...updates };

    try {
      await invoke('update_floating_config', {
        label,
        title: null,
        width: config.width,
        height: config.height,
        x: config.x,
        y: config.y,
        alwaysOnTop: true,
        transparent: true,
        opacity: config.opacity,
        skipTaskbar: true,
        resizable: true,
        decorations: false,
      });

      updateFloating(noteId, updates);

      // 同步保存到数据库
      await saveConfigToDb(noteId, { ...updates });
    } catch (error) {
      throw error;
    }
  }, [floatingWindows, updateFloating, saveConfigToDb]);

  // 设置窗口透明度
  const setWindowOpacity = useCallback(async (noteId: string, opacity: number) => {
    await updateFloatingWindow(noteId, { opacity });
  }, [updateFloatingWindow]);

  // 切换鼠标穿透
  const toggleMousePenetration = useCallback(async (noteId: string, enabled: boolean) => {
    const label = `floating-${noteId}`;

    try {
      await invoke('toggle_penetration', { label, enabled });
      updateFloating(noteId, { isPenetrable: enabled });
    } catch (error) {
      throw error;
    }
  }, [updateFloating]);

  // 检查悬浮窗是否存在
  const checkFloatingExists = useCallback(async (noteId: string): Promise<boolean> => {
    const label = `floating-${noteId}`;
    try {
      return await invoke<boolean>('floating_exists', { label });
    } catch {
      return false;
    }
  }, []);

  // 从数据库加载配置
  const loadConfigFromDb = useCallback(async (noteId: string): Promise<Partial<FloatingConfig> | null> => {
    try {
      return await invoke<Partial<FloatingConfig> | null>('get_floating_config_from_db', { noteId });
    } catch {
      return null;
    }
  }, []);

  // 贴边检测
  const checkEdgeSnap = useCallback((x: number, y: number, width: number, height: number): EdgePosition | null => {
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;

    if (x <= EDGE_THRESHOLD) return 'left';
    if (x + width >= screenWidth - EDGE_THRESHOLD) return 'right';
    if (y <= EDGE_THRESHOLD) return 'top';
    if (y + height >= screenHeight - EDGE_THRESHOLD) return 'bottom';

    return null;
  }, []);

  // 获取贴边后的位置
  const getSnappedPosition = useCallback((edge: EdgePosition, width: number, height: number) => {
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;

    switch (edge) {
      case 'left':
        return { x: -width + AUTO_COLLAPSE_WIDTH, y: 100 };
      case 'right':
        return { x: screenWidth - AUTO_COLLAPSE_WIDTH, y: 100 };
      case 'top':
        return { x: 100, y: -height + AUTO_COLLAPSE_HEIGHT };
      case 'bottom':
        return { x: 100, y: screenHeight - AUTO_COLLAPSE_HEIGHT };
      default:
        return { x: 100, y: 100 };
    }
  }, []);

  return {
    createFloatingWindow,
    closeFloatingWindow,
    updateFloatingWindow,
    setWindowOpacity,
    toggleMousePenetration,
    checkFloatingExists,
    loadConfigFromDb,
    saveConfigToDb,
    checkEdgeSnap,
    getSnappedPosition,
  };
}

// 使用贴边自动收起的 Hook
export function useEdgeAutoCollapse(noteId: string, config: FloatingConfig) {
  const [isSnapped, setIsSnapped] = useState(false);
  const [snappedEdge, setSnappedEdge] = useState<EdgePosition>(null);
  const { checkEdgeSnap, getSnappedPosition, updateFloatingWindow } = useFloatingWindow();

  useEffect(() => {
    if (config.isCollapsed) return;

    const edge = checkEdgeSnap(config.x, config.y, config.width, config.height);
    setSnappedEdge(edge);
    setIsSnapped(!!edge);
  }, [config.x, config.y, config.width, config.height, config.isCollapsed]);

  // 处理贴边/展开
  const toggleSnap = useCallback(async () => {
    if (!isSnapped) {
      // 尝试贴边
      const edge = checkEdgeSnap(config.x, config.y, config.width, config.height);
      if (edge) {
        const pos = getSnappedPosition(edge, config.width, config.height);
        await updateFloatingWindow(noteId, {
          x: pos.x,
          y: pos.y,
          isCollapsed: true,
        });
      }
    } else {
      // 展开
      const screenWidth = window.screen.availWidth;
      const screenHeight = window.screen.availHeight;

      let newX = config.x;
      let newY = config.y;

      // 根据贴边方向展开
      switch (snappedEdge) {
        case 'left':
          newX = EDGE_THRESHOLD + 10;
          break;
        case 'right':
          newX = screenWidth - config.width - EDGE_THRESHOLD - 10;
          break;
        case 'top':
          newY = EDGE_THRESHOLD + 10;
          break;
        case 'bottom':
          newY = screenHeight - config.height - EDGE_THRESHOLD - 10;
          break;
      }

      await updateFloatingWindow(noteId, {
        x: newX,
        y: newY,
        isCollapsed: false,
      });
    }
  }, [isSnapped, snappedEdge, config, noteId, updateFloatingWindow, checkEdgeSnap, getSnappedPosition]);

  return { isSnapped, snappedEdge, toggleSnap };
}
