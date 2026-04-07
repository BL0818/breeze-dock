"use client"

import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { Folder } from "lucide-react"

interface GroupDropZoneProps {
  groupId: string | null
  groupName: string
  isActive?: boolean
  className?: string
}

export function GroupDropZone({
  groupId,
  groupName,
  isActive: isActiveProp,
  className,
}: GroupDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: groupId ? `group-${groupId}` : 'ungrouped',
  })

  const isActive = isActiveProp ?? isOver

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md",
        "text-[13px] transition-all duration-150",
        isActive
          ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border-2 border-dashed border-[var(--color-primary)]/30"
          : "bg-gray-50 dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 border-2 border-transparent",
        className
      )}
    >
      <Folder className="w-4 h-4" />
      <span className="flex-1 truncate">{groupName}</span>
      {isActive && (
        <span className="text-[11px] text-[var(--color-primary)]">释放以移动</span>
      )}
    </div>
  )
}
