"use client"

import * as React from "react"
import { forwardRef } from "react"
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Group } from "@/types"

export interface GroupItemProps {
  group: Group
  level: number
  isSelected: boolean
  isExpanded: boolean
  hasChildren: boolean
  onSelect: () => void
  onToggleExpand: () => void
  onContextMenu: (e: React.MouseEvent) => void
  noteCount?: number
  className?: string
}

const GroupItem = forwardRef<HTMLDivElement, GroupItemProps>(
  (
    {
      group,
      level,
      isSelected,
      isExpanded,
      hasChildren,
      onSelect,
      onToggleExpand,
      onContextMenu,
      noteCount,
      className,
    },
    ref
  ) => {
    const paddingLeft = level * 12 + 8

    return (
      <div
        ref={ref}
        className={cn(
          "group flex items-center gap-1.5 h-8 px-2 rounded-md",
          "text-[13px] cursor-pointer select-none",
          "transition-colors duration-150",
          isSelected
            ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)] font-medium"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] hover:text-gray-900 dark:hover:text-gray-200",
          className
        )}
        style={{ paddingLeft }}
        onClick={onSelect}
        onContextMenu={onContextMenu}
        data-group-id={group.id}
        data-selected={isSelected}
      >
        {/* 展开/折叠按钮 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className={cn(
            "flex items-center justify-center w-4 h-4 rounded-sm",
            "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
            "transition-colors duration-150",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {/* 文件夹图标 */}
        <div className={cn(
          "flex-shrink-0",
          isSelected && "text-[var(--color-primary)]"
        )}>
          {isExpanded && hasChildren ? (
            <FolderOpen className="w-4 h-4 opacity-80" />
          ) : (
            <Folder className="w-4 h-4 opacity-80" />
          )}
        </div>

        {/* 分组名称 */}
        <span className="flex-1 truncate">{group.name}</span>

        {/* 笔记数量 */}
        {noteCount !== undefined && noteCount > 0 && (
          <span
            className={cn(
              "text-[11px] tabular-nums",
              isSelected
                ? "text-[var(--color-primary)]/70"
                : "text-gray-400 group-hover:text-gray-500"
            )}
          >
            {noteCount}
          </span>
        )}
      </div>
    )
  }
)

GroupItem.displayName = "GroupItem"

export { GroupItem }
