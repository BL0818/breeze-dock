"use client"

import { forwardRef } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TagData {
  id: string
  name: string
  color: string
}

export interface TagProps {
  id: string
  name: string
  color: string
  size?: "sm" | "md"
  removable?: boolean
  onRemove?: () => void
  onClick?: () => void
  className?: string
}

const Tag = forwardRef<HTMLDivElement, TagProps>(
  (
    { id, name, color, size = "md", removable = false, onRemove, onClick, className },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-5 px-1.5 text-[11px] gap-1",
      md: "h-6 px-2 text-xs gap-1.5",
    }

    return (
      <div
        ref={ref}
        data-tag-id={id}
        className={cn(
          "inline-flex items-center rounded-md font-medium whitespace-nowrap",
          "transition-all duration-150 select-none",
          "shadow-sm",
          sizeClasses[size],
          onClick && "cursor-pointer hover:shadow-md hover:brightness-105",
          className
        )}
        style={{
          backgroundColor: `${color}15`,
          color: color,
          border: `1px solid ${color}30`,
        }}
        onClick={onClick}
      >
        <span className="truncate max-w-[120px]">{name}</span>
        {removable && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className={cn(
              "flex items-center justify-center rounded-full",
              "opacity-60 hover:opacity-100 hover:bg-black/10",
              "transition-opacity duration-150",
              size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"
            )}
            aria-label={`移除 ${name}`}
          >
            <X className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
          </button>
        )}
      </div>
    )
  }
)

Tag.displayName = "Tag"

export { Tag }
