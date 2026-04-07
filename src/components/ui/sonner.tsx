import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Toast 通知组件（基于 sonner）
 *
 * 适配 Tauri 应用：通过 HTML class 检测暗色模式，不依赖 next-themes
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const isDark = typeof document !== 'undefined'
    && document.documentElement.classList.contains('dark')

  return (
    <Sonner
      theme={isDark ? "dark" : "light"}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-[var(--color-success)]" />,
        info: <InfoIcon className="size-4 text-[var(--color-info)]" />,
        warning: <TriangleAlertIcon className="size-4 text-[var(--color-warning)]" />,
        error: <OctagonXIcon className="size-4 text-[var(--color-error)]" />,
        loading: <Loader2Icon className="size-4 animate-spin text-[var(--color-primary)]" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover, #fff)",
          "--normal-text": "var(--popover-foreground, #1c1c1e)",
          "--normal-border": "var(--border, #e5e5e5)",
          // success 变体：跟随用户设置的成功色
          "--success-bg": "color-mix(in srgb, var(--color-success) 12%, var(--popover, #fff))",
          "--success-border": "color-mix(in srgb, var(--color-success) 40%, transparent)",
          "--success-text": "var(--color-success)",
          // error 变体：跟随用户设置的错误色
          "--error-bg": "color-mix(in srgb, var(--color-error) 12%, var(--popover, #fff))",
          "--error-border": "color-mix(in srgb, var(--color-error) 40%, transparent)",
          "--error-text": "var(--color-error)",
          // warning 变体：跟随用户设置的警告色
          "--warning-bg": "color-mix(in srgb, var(--color-warning) 12%, var(--popover, #fff))",
          "--warning-border": "color-mix(in srgb, var(--color-warning) 40%, transparent)",
          "--warning-text": "var(--color-warning)",
          // info 变体：跟随用户设置的信息色
          "--info-bg": "color-mix(in srgb, var(--color-info) 12%, var(--popover, #fff))",
          "--info-border": "color-mix(in srgb, var(--color-info) 40%, transparent)",
          "--info-text": "var(--color-info)",
          "--border-radius": "var(--radius, 12px)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
