"use client"

import { forwardRef } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

// Tailwind CSS 预设颜色 (500 色阶)
export const PRESET_COLORS = [
  "#6366f1", // Indigo 靛蓝
  "#8b5cf6", // Violet 紫罗兰
  "#d946ef", // Fuchsia 洋红
  "#f43f5e", // Rose 玫瑰红
  "#f59e0b", // Amber 琥珀
  "#0ea5e9", // Sky 天蓝
  "#06b6d4", // Cyan 青色
  "#14b8a6", // Teal 蓝绿
  "#10b981", // Emerald 翠绿
  "#64748b", // Slate 板岩灰
  "#71717a", // Zinc 锌灰
  "#78716c", // Stone 石头灰
] as const

export interface ColorPickerProps {
  colors?: readonly string[] | string[]
  selected: string
  onSelect: (color: string) => void
  size?: "sm" | "md"
  className?: string
}

const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(
  ({ colors = PRESET_COLORS, selected, onSelect, size = "md", className }, ref) => {
    const sizeClasses = {
      sm: "w-5 h-5",
      md: "w-6 h-6",
    }

    const iconSizes = {
      sm: "w-2.5 h-2.5",
      md: "w-3 h-3",
    }

    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap gap-1.5", className)}
        role="radiogroup"
        aria-label="颜色选择"
      >
        {colors.map((color) => {
          const isSelected = selected === color
          return (
            <Tooltip key={color}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(color)
                  }}
                  className={cn(
                    "rounded-full flex items-center justify-center transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    sizeClasses[size],
                    isSelected
                      ? "ring-2 ring-offset-1 ring-foreground/20"
                      : "hover:scale-110"
                  )}
                  style={{ backgroundColor: color }}
                >
                  {isSelected && (
                    <Check
                      className={cn(
                        iconSizes[size],
                        "text-white drop-shadow-sm"
                      )}
                      strokeWidth={3}
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{color}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    )
  }
)

ColorPicker.displayName = "ColorPicker"

export { ColorPicker }
