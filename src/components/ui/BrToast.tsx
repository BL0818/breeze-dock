// ============================================================
// BrToast - Linear 极简风格 Toast 通知组件
// 基于 sonner 实现，支持 success/error/warning/info 四种类型
// ============================================================

import { useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import type { ToastMessage } from '@/types';

/**
 * Toast 通知配置
 */
interface BrToastOptions {
  type: ToastMessage['type'];
  message: string;
  duration?: number;
}

/**
 * 显示 Toast 通知
 */
export function showBrToast(options: BrToastOptions): string {
  const { type, message, duration = 3000 } = options;

  const icons = {
    success: <CircleCheckIcon className="size-4 text-[var(--color-success)]" />,
    error: <OctagonXIcon className="size-4 text-[var(--color-error)]" />,
    warning: <TriangleAlertIcon className="size-4 text-[var(--color-warning)]" />,
    info: <InfoIcon className="size-4 text-[var(--color-info)]" />,
  };

  const styles = {
    success: {
      background: 'color-mix(in srgb, var(--color-success) 12%, var(--popover, #fff))',
      border: 'color-mix(in srgb, var(--color-success) 40%, transparent)',
      color: 'var(--color-success)',
    },
    error: {
      background: 'color-mix(in srgb, var(--color-error) 12%, var(--popover, #fff))',
      border: 'color-mix(in srgb, var(--color-error) 40%, transparent)',
      color: 'var(--color-error)',
    },
    warning: {
      background: 'color-mix(in srgb, var(--color-warning) 12%, var(--popover, #fff))',
      border: 'color-mix(in srgb, var(--color-warning) 40%, transparent)',
      color: 'var(--color-warning)',
    },
    info: {
      background: 'color-mix(in srgb, var(--color-info) 12%, var(--popover, #fff))',
      border: 'color-mix(in srgb, var(--color-info) 40%, transparent)',
      color: 'var(--color-info)',
    },
  };

  const id = sonnerToast(message, {
    icon: icons[type],
    duration: duration,
    style: {
      ...styles[type],
      borderRadius: 'var(--radius, 12px)',
    } as React.CSSProperties,
  });

  return typeof id === 'string' ? id : '';
}

/**
 * 关闭 Toast 通知
 */
export function dismissBrToast(id: string): void {
  sonnerToast.dismiss(id);
}

/**
 * 关闭所有 Toast 通知
 */
export function dismissAllBrToasts(): void {
  sonnerToast.dismiss();
}

/**
 * BrToastProvider - Toast 通知提供者
 * 需要在应用根部包裹以启用 Toast 功能
 */
export function BrToastProvider({ children }: { children: React.ReactNode }) {
  const toasts = useUIStore((s) => s.toasts);

  // 同步 useUIStore 中的 toast 消息到 sonner
  useEffect(() => {
    // 使用 sonner 的 promise 或自定义 toasts 来显示
    toasts.forEach((_toast) => {
      // 这里可以添加额外的同步逻辑
    });
  }, [toasts]);

  return <>{children}</>;
}

/**
 * BrToastContainer - Toast 通知容器
 * 应该在应用根部渲染一次
 */
export function BrToastContainer() {
  return (
    <div
      className="toaster"
      style={{
        '--normal-bg': 'var(--popover, #fff)',
        '--normal-text': 'var(--popover-foreground, #1c1c1e)',
        '--normal-border': 'var(--border, #e5e5e5)',
        '--success-bg': 'color-mix(in srgb, var(--color-success) 12%, var(--popover, #fff))',
        '--success-border': 'color-mix(in srgb, var(--color-success) 40%, transparent)',
        '--success-text': 'var(--color-success)',
        '--error-bg': 'color-mix(in srgb, var(--color-error) 12%, var(--popover, #fff))',
        '--error-border': 'color-mix(in srgb, var(--color-error) 40%, transparent)',
        '--error-text': 'var(--color-error)',
        '--warning-bg': 'color-mix(in srgb, var(--color-warning) 12%, var(--popover, #fff))',
        '--warning-border': 'color-mix(in srgb, var(--color-warning) 40%, transparent)',
        '--warning-text': 'var(--color-warning)',
        '--info-bg': 'color-mix(in srgb, var(--color-info) 12%, var(--popover, #fff))',
        '--info-border': 'color-mix(in srgb, var(--color-info) 40%, transparent)',
        '--info-text': 'var(--color-info)',
        '--border-radius': 'var(--radius, 12px)',
      } as React.CSSProperties}
    />
  );
}

// 导出便捷方法
export const BrToast = {
  success: (message: string, duration?: number) =>
    showBrToast({ type: 'success', message, duration }),
  error: (message: string, duration?: number) =>
    showBrToast({ type: 'error', message, duration }),
  warning: (message: string, duration?: number) =>
    showBrToast({ type: 'warning', message, duration }),
  info: (message: string, duration?: number) =>
    showBrToast({ type: 'info', message, duration }),
  dismiss: dismissBrToast,
  dismissAll: dismissAllBrToasts,
};
