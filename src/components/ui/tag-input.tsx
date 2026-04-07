"use client"

import * as React from "react"
import { forwardRef, useState, useRef, useCallback, useMemo, useEffect } from "react"
import { Plus, ChevronDown, Tag as TagIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tag, TagData } from "./tag"
import { ColorPicker, PRESET_COLORS } from "./color-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface TagInputProps {
  tags: TagData[]
  availableTags: TagData[]
  onAdd: (tagId: string) => void
  onCreate: (name: string, color: string) => void
  onRemove: (tagId: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const TagInput = forwardRef<HTMLDivElement, TagInputProps>(
  (
    {
      tags,
      availableTags,
      onAdd,
      onCreate,
      onRemove,
      placeholder = "添加标签...",
      className,
      disabled = false,
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0])
    const inputRef = useRef<HTMLInputElement>(null)

    // Popover 打开时聚焦输入框
    useEffect(() => {
      if (isOpen) {
        // 使用 setTimeout 确保在 Popover 动画完成后聚焦
        setTimeout(() => {
          inputRef.current?.focus()
        }, 50)
      }
    }, [isOpen])

    // 过滤已选标签和根据输入筛选可用标签
    const filteredAvailable = useMemo(() => {
      const selectedIds = new Set(tags.map((t) => t.id))
      const unselected = availableTags.filter((t) => !selectedIds.has(t.id))

      if (!inputValue.trim()) return unselected

      const lowerInput = inputValue.toLowerCase()
      return unselected.filter((t) =>
        t.name.toLowerCase().includes(lowerInput)
      )
    }, [availableTags, tags, inputValue])

    // 检查输入的标签名是否已存在
    const existingTag = useMemo(() => {
      const lowerInput = inputValue.trim().toLowerCase()
      if (!lowerInput) return null
      return availableTags.find((t) => t.name.toLowerCase() === lowerInput)
    }, [availableTags, inputValue])

    const handleCreateTag = useCallback(() => {
      const name = inputValue.trim()
      if (!name) return

      if (existingTag) {
        onAdd(existingTag.id)
      } else {
        onCreate(name, selectedColor)
      }

      setInputValue("")
      setSelectedColor(PRESET_COLORS[0])
      inputRef.current?.focus()
    }, [inputValue, existingTag, selectedColor, onAdd, onCreate])

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleCreateTag()
      } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
        onRemove(tags[tags.length - 1].id)
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-wrap items-center gap-1.5 p-2",
          "rounded-md border border-input bg-background",
          "focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring",
          "transition-all duration-150",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        {/* 已选标签 */}
        {tags.map((tag) => (
          <Tag
            key={tag.id}
            id={tag.id}
            name={tag.name}
            color={tag.color}
            size="sm"
            removable
            onRemove={() => onRemove(tag.id)}
          />
        ))}

        {/* 添加标签按钮/输入 */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 h-5 px-2",
                "text-[11px] text-muted-foreground",
                "rounded-md border border-dashed border-input",
                "hover:bg-accent hover:text-accent-foreground",
                "transition-colors duration-150"
              )}
            >
              <Plus className="w-3 h-3" />
              <span>{placeholder}</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-64 p-3 space-y-3"
            onPointerDownOutside={(e) => {
              // 阻止点击外部关闭，只有点击触发按钮时才关闭
              const target = e.target as HTMLElement
              if (target.closest('[data-slot="popover-trigger"]')) {
                setIsOpen(false)
              } else {
                e.preventDefault()
              }
            }}
            onEscapeKeyDown={() => setIsOpen(false)}
          >
            {/* 输入框 */}
            <div className="space-y-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入标签名称..."
                className="h-8 text-sm"
              />

              {/* 颜色选择（仅新建时显示） */}
              {!existingTag && inputValue.trim() && (
                <div className="pt-1">
                  <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">
                    选择颜色
                  </p>
                  <ColorPicker
                    colors={PRESET_COLORS}
                    selected={selectedColor}
                    onSelect={setSelectedColor}
                    size="sm"
                  />
                </div>
              )}

              {/* 创建按钮 */}
              {inputValue.trim() && (
                <Button
                  size="sm"
                  className="w-full h-7 text-xs mt-2"
                  onClick={handleCreateTag}
                >
                  {existingTag ? (
                    <>
                      <TagIcon className="w-3 h-3 mr-1" />
                      添加现有标签 "{existingTag.name}"
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-1" />
                      创建 "{inputValue.trim()}"
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* 可用标签列表 */}
            {filteredAvailable.length > 0 && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    可用标签
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {filteredAvailable.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          onAdd(tag.id)
                          setInputValue("")
                          setIsOpen(false)
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm",
                          "text-sm hover:bg-accent transition-colors duration-150"
                        )}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 text-left truncate">
                          {tag.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)

TagInput.displayName = "TagInput"

export { TagInput }
