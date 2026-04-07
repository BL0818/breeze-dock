"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { NoteCard } from "@/components/ui/note-card"
import type { Note } from "@/types"

interface SortableNoteItemProps {
  note: Note
  isSelected: boolean
  onClick: () => void
  formatTime: (dateStr: string) => string
}

export function SortableNoteItem({
  note,
  isSelected,
  onClick,
  formatTime,
}: SortableNoteItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative",
        isDragging && "opacity-50 z-50"
      )}
    >
      <NoteCard
        title={note.title || '无标题'}
        content={
          note.content
            ? note.content.substring(0, 50).replace(/[#*_[\]]/g, '')
            : '空白笔记'
        }
        time={formatTime(note.updatedAt)}
        isPinned={note.isPinned}
        isStarred={note.isStarred}
        isActive={isSelected}
        onClick={onClick}
      />
      {/* 拖拽手柄指示器 */}
      <div
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r",
          "bg-[var(--color-primary)] opacity-0 transition-opacity duration-150",
          "group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        )}
      />
    </div>
  )
}
