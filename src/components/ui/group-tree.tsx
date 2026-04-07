"use client"

import * as React from "react"
import { forwardRef, useMemo, useCallback, useState } from "react"
import { FolderPlus, Edit3, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Group, GroupId } from "@/types"
import { GroupItem } from "./group-item"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface GroupTreeProps {
  groups: Group[]
  selectedId?: string | null
  expandedIds: Set<string>
  onSelect: (id: string | null) => void
  onToggleExpand: (id: string) => void
  onCreate: (parentId?: string | null) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onReorder?: (dragId: string, targetId: string) => void
  onMoveGroup?: (dragId: string, targetId: string, position: 'before' | 'after' | 'inside') => void
  onNoteDrop?: (noteId: string, groupId: string) => void
  getNoteCount?: (groupId: string) => number
  getGroupDepth?: (id: string) => number
  maxDepth?: number
  className?: string
  showRoot?: boolean
  rootLabel?: string
}

interface FlatGroup {
  group: Group
  level: number
  hasChildren: boolean
}

const GroupTree = forwardRef<HTMLDivElement, GroupTreeProps>(
  (
    {
      groups,
      selectedId,
      expandedIds,
      onSelect,
      onToggleExpand,
      onCreate,
      onRename,
      onDelete,
      onReorder,
      onMoveGroup,
      onNoteDrop,
      getNoteCount,
      getGroupDepth,
      maxDepth = 5,
      className,
    },
    ref
  ) => {
    const [renameDialog, setRenameDialog] = React.useState<{
      open: boolean
      groupId: string | null
      name: string
    }>({ open: false, groupId: null, name: "" })

    const [deleteDialog, setDeleteDialog] = React.useState<{
      open: boolean
      groupId: string | null
      groupName: string
    }>({ open: false, groupId: null, groupName: "" })

    // 拖拽状态
    const [draggedId, setDraggedId] = useState<string | null>(null)
    const [dragOverId, setDragOverId] = useState<string | null>(null)
    const [dragPosition, setDragPosition] = useState<'before' | 'after' | 'inside' | null>(null)

    // 构建树形结构
    const tree = useMemo(() => {
      const map = new Map<GroupId, Group>()
      const roots: Group[] = []

      groups.forEach((g) => map.set(g.id, { ...g, children: [] }))
      groups.forEach((g) => {
        const node = map.get(g.id)!
        if (g.parentId && map.has(g.parentId)) {
          map.get(g.parentId)!.children!.push(node)
        } else {
          roots.push(node)
        }
      })

      roots.sort((a, b) => a.sortOrder - b.sortOrder)
      return roots
    }, [groups])

    // 扁平化树（仅展开的部分）
    const flatGroups = useMemo(() => {
      const result: FlatGroup[] = []

      const traverse = (nodes: Group[], level: number) => {
        nodes.forEach((group) => {
          const hasChildren = (group.children?.length ?? 0) > 0
          result.push({ group, level, hasChildren })

          if (expandedIds.has(group.id) && group.children) {
            traverse(group.children, level + 1)
          }
        })
      }

      traverse(tree, 0)
      return result
    }, [tree, expandedIds])

    // 查找分组
    const findGroup = useCallback(
      (id: string): Group | undefined => {
        return groups.find((g) => g.id === id)
      },
      [groups]
    )

    // 处理重命名
    const handleRenameSubmit = () => {
      if (renameDialog.groupId && renameDialog.name.trim()) {
        onRename(renameDialog.groupId, renameDialog.name.trim())
        setRenameDialog({ open: false, groupId: null, name: "" })
      }
    }

    // 处理删除
    const handleDeleteConfirm = () => {
      if (deleteDialog.groupId) {
        onDelete(deleteDialog.groupId)
        setDeleteDialog({ open: false, groupId: null, groupName: "" })
      }
    }

    // 打开重命名对话框
    const openRenameDialog = (groupId: string) => {
      const group = findGroup(groupId)
      if (group) {
        setRenameDialog({ open: true, groupId, name: group.name })
      }
    }

    // 打开删除对话框
    const openDeleteDialog = (groupId: string) => {
      const group = findGroup(groupId)
      if (group) {
        setDeleteDialog({ open: true, groupId, groupName: group.name })
      }
    }

    // 计算拖拽放置位置
    const calculateDropPosition = (e: React.DragEvent, level: number): 'before' | 'after' | 'inside' => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const offsetY = e.clientY - rect.top
      const height = rect.height

      // 上半部分 -> before, 下半部分 -> after
      // 如果鼠标在左侧缩进区域内，且该分组有子分组 -> inside
      const paddingLeft = level * 12 + 24 // 大致的图标区域左边界
      const relativeX = e.clientX - rect.left

      if (offsetY < height * 0.3) return 'before'
      if (offsetY > height * 0.7) return 'after'
      if (relativeX > paddingLeft) return 'inside'
      return offsetY < height / 2 ? 'before' : 'after'
    }

    // 检查是否允许放置到内部（六级嵌套限制）
    const canDropInside = (dragId: string, targetId: string): boolean => {
      const targetDepth = getGroupDepth?.(targetId) ?? 0
      // 如果拖拽分组本身有子分组，需要考虑其最大深度
      const dragGroup = findGroup(dragId)
      if (!dragGroup) return false

      // 获取拖拽分组的最大深度（包含自身）
      const getMaxDepth = (group: Group, currentDepth: number): number => {
        if (!group.children || group.children.length === 0) return currentDepth
        return Math.max(...group.children.map((g) => getMaxDepth(g, currentDepth + 1)))
      }

      // 从 tree 中获取拖拽分组的完整子树
      const treeMap = new Map<GroupId, Group>()
      groups.forEach((g) => treeMap.set(g.id, g))

      const buildSubtree = (id: GroupId): Group => {
        const g = treeMap.get(id)!
        const children = groups.filter((cg) => cg.parentId === id).sort((a, b) => a.sortOrder - b.sortOrder)
        return { ...g, children: children.map((c) => buildSubtree(c.id)) }
      }

      const subtree = buildSubtree(dragId)
      const dragMaxDepth = getMaxDepth(subtree, 0)
      const depthDelta = dragMaxDepth // 拖拽项相对于自己的最大深度

      return targetDepth + 1 + depthDelta <= maxDepth
    }

    const handleDragStart = (e: React.DragEvent, groupId: string) => {
      setDraggedId(groupId)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/group-id', groupId)
      // 隐藏默认拖拽图片以获得更干净的体验
      const emptyImg = new Image()
      emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      e.dataTransfer.setDragImage(emptyImg, 0, 0)
    }

    const handleDragOver = (e: React.DragEvent, groupId: string, level: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      if (draggedId === groupId) {
        setDragOverId(null)
        setDragPosition(null)
        return
      }

      const position = calculateDropPosition(e, level)

      // 如果尝试放入内部但不允许，转换为 before 或 after
      let finalPosition = position
      if (position === 'inside' && draggedId) {
        if (!canDropInside(draggedId, groupId)) {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const offsetY = e.clientY - rect.top
          finalPosition = offsetY < rect.height / 2 ? 'before' : 'after'
        }
      }

      setDragOverId(groupId)
      setDragPosition(finalPosition)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      // 延迟清除以避免闪烁
      // 简单处理：直接清除
      setDragOverId(null)
      setDragPosition(null)
    }

    const handleDrop = (e: React.DragEvent, groupId: string) => {
      e.preventDefault()
      e.stopPropagation()

      const noteId = e.dataTransfer.getData('text/note-id')
      const dragGroupId = e.dataTransfer.getData('text/group-id') || draggedId

      if (noteId && onNoteDrop) {
        onNoteDrop(noteId, groupId)
      } else if (dragGroupId && dragGroupId !== groupId) {
        const position = dragPosition || 'after'
        if (onMoveGroup) {
          onMoveGroup(dragGroupId, groupId, position)
        } else if (onReorder && (position === 'before' || position === 'after')) {
          onReorder(dragGroupId, groupId)
        }
      }

      setDraggedId(null)
      setDragOverId(null)
      setDragPosition(null)
    }

    const handleDragEnd = () => {
      setDraggedId(null)
      setDragOverId(null)
      setDragPosition(null)
    }

    return (
      <>
        <div
          ref={ref}
          className={cn("flex flex-col gap-0.5", className)}
          role="tree"
          aria-label="分组树"
          onDragOver={(e) => {
            // 允许拖拽到空白区域
            e.preventDefault()
          }}
        >
          {/* 分组列表 */}
          {flatGroups.map(({ group, level, hasChildren }) => {
            const isDragOver = dragOverId === group.id
            const isDragged = draggedId === group.id

            return (
              <div
                key={group.id}
                className={cn(
                  "relative transition-all duration-150",
                  isDragged && "opacity-40"
                )}
                onDragOver={(e) => handleDragOver(e, group.id, level)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, group.id)}
              >
                {/* 放置指示器 - before */}
                {isDragOver && dragPosition === 'before' && (
                  <div className="absolute -top-[1px] left-0 right-0 h-[2px] bg-[var(--color-primary)] rounded-full z-10" />
                )}
                {/* 放置指示器 - inside */}
                {isDragOver && dragPosition === 'inside' && (
                  <div className="absolute inset-0 bg-[var(--color-primary-subtle)] rounded-md pointer-events-none z-0" />
                )}

                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div draggable onDragStart={(e) => handleDragStart(e, group.id)} onDragEnd={handleDragEnd}>
                      <GroupItem
                        group={group}
                        level={level}
                        isSelected={selectedId === group.id}
                        isExpanded={expandedIds.has(group.id)}
                        hasChildren={hasChildren}
                        onSelect={() => onSelect(group.id)}
                        onToggleExpand={() => onToggleExpand(group.id)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                        }}
                        noteCount={getNoteCount?.(group.id)}
                        className={cn(
                          isDragOver && dragPosition === 'inside' && "bg-[var(--color-primary-subtle)]"
                        )}
                      />
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-40">
                    <ContextMenuItem
                      onClick={() => onCreate(group.id)}
                      className="text-xs"
                    >
                      <FolderPlus className="w-3.5 h-3.5 mr-2" />
                      新建子分组
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => openRenameDialog(group.id)}
                      className="text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-2" />
                      重命名
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => openDeleteDialog(group.id)}
                      className="text-xs text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      删除
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>

                {/* 放置指示器 - after */}
                {isDragOver && dragPosition === 'after' && (
                  <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[var(--color-primary)] rounded-full z-10" />
                )}
              </div>
            )
          })}
        </div>

        {/* 重命名对话框 */}
        <Dialog
          open={renameDialog.open}
          onOpenChange={(open) =>
            !open && setRenameDialog({ open: false, groupId: null, name: "" })
          }
        >
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="text-base">重命名分组</DialogTitle>
              <DialogDescription className="text-xs">
                请输入新的分组名称
              </DialogDescription>
            </DialogHeader>
            <Input
              value={renameDialog.name}
              onChange={(e) =>
                setRenameDialog((prev) => ({ ...prev, name: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
              placeholder="分组名称"
              className="mt-2"
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setRenameDialog({ open: false, groupId: null, name: "" })
                }
              >
                取消
              </Button>
              <Button size="sm" onClick={handleRenameSubmit}>
                确认
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog
          open={deleteDialog.open}
          onOpenChange={(open) =>
            !open && setDeleteDialog({ open: false, groupId: null, groupName: "" })
          }
        >
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="text-base">删除分组</DialogTitle>
              <DialogDescription className="text-xs">
                确定要删除分组 "{deleteDialog.groupName}" 吗？此操作不可撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setDeleteDialog({ open: false, groupId: null, groupName: "" })
                }
              >
                取消
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
              >
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }
)

GroupTree.displayName = "GroupTree"

export { GroupTree }
