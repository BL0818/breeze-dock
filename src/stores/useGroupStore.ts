import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Group, GroupId } from '../types';
import { toast } from 'sonner';

interface GroupState {
  groups: Group[];
  expandedIds: Set<GroupId>;
  selectedGroupId: GroupId | null;
  isLoading: boolean;
}

interface GroupActions {
  // 数据加载
  loadGroups: () => Promise<void>;

  // CRUD 操作
  createGroup: (name: string, parentId?: GroupId | null, icon?: string) => Promise<Group | null>;
  updateGroup: (id: GroupId, updates: Partial<Omit<Group, 'id' | 'createdAt'>>) => Promise<void>;
  deleteGroup: (id: GroupId) => Promise<void>;

  // 排序操作
  reorderGroups: (dragId: GroupId, targetId: GroupId) => Promise<void>;

  // 展开/折叠状态
  toggleExpand: (id: GroupId) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // 选择状态
  selectGroup: (id: GroupId | null) => void;

  // 查询方法
  getGroupTree: () => Group[];
  getGroupById: (id: GroupId) => Group | undefined;
  getChildGroups: (parentId: GroupId | null) => Group[];
  getGroupPath: (id: GroupId) => Group[];
  isAncestor: (ancestorId: GroupId, descendantId: GroupId) => boolean;

  // 获取分组深度（从根到该分组的层级数，根为0）
  getGroupDepth: (id: GroupId) => number;

  // 获取所有后代分组ID（包括自身）
  getDescendantIds: (id: GroupId | null) => GroupId[];

  // 移动分组到指定位置
  moveGroup: (dragId: GroupId, targetId: GroupId, position: 'before' | 'after' | 'inside') => Promise<void>;
}

type GroupStore = GroupState & GroupActions;

/** 将扁平列表转为树形结构 */
function buildTree(flat: Group[]): Group[] {
  const map = new Map<GroupId, Group>();
  const roots: Group[] = [];

  // 初始化映射
  flat.forEach((g) => map.set(g.id, { ...g, children: [] }));

  // 构建树形结构
  flat.forEach((g) => {
    const node = map.get(g.id)!;
    if (g.parentId && map.has(g.parentId)) {
      const parent = map.get(g.parentId)!;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // 对根节点和每个父节点的子节点进行排序
  const sortNodes = (nodes: Group[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(roots);
  return roots;
}

/** 获取分组路径（从根到当前分组） */
function getGroupPathRecursive(
  groups: Group[],
  targetId: GroupId,
  path: Group[] = []
): Group[] | null {
  for (const group of groups) {
    if (group.id === targetId) {
      return [...path, group];
    }
    if (group.children && group.children.length > 0) {
      const result = getGroupPathRecursive(group.children, targetId, [...path, group]);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

/** 检查是否为祖先 */
function isAncestorRecursive(groups: Group[], ancestorId: GroupId, descendantId: GroupId): boolean {
  for (const group of groups) {
    if (group.id === ancestorId) {
      // 找到祖先，检查其子节点中是否有后代
      const hasDescendant = (nodes: Group[], targetId: GroupId): boolean => {
        for (const node of nodes) {
          if (node.id === targetId) return true;
          if (node.children && hasDescendant(node.children, targetId)) return true;
        }
        return false;
      };
      return group.children ? hasDescendant(group.children, descendantId) : false;
    }
    if (group.children && group.children.length > 0) {
      const result = isAncestorRecursive(group.children, ancestorId, descendantId);
      if (result) return true;
    }
  }
  return false;
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  // ---- 初始状态 ----
  groups: [],
  expandedIds: new Set(),
  selectedGroupId: null,
  isLoading: false,

  // ---- 数据加载 ----
  loadGroups: async () => {
    set({ isLoading: true });
    try {
      const groups = await invoke<Group[]>('get_groups');
      set({ groups, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error(`加载分组失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- CRUD 操作 ----
  createGroup: async (name: string, parentId: GroupId | null = null, icon: string = 'folder') => {
    try {
      // 计算新分组的排序值（同级最后一个 + 1）
      const siblings = get().groups.filter((g) => g.parentId === parentId);
      const maxOrder = siblings.length > 0
        ? Math.max(...siblings.map((g) => g.sortOrder))
        : -1;

      const group = await invoke<Group>('create_group', {
        name: name.trim(),
        parentId,
        icon,
        sortOrder: maxOrder + 1
      });

      set((state) => ({
        groups: [...state.groups, group]
      }));

      // 自动展开父分组
      if (parentId) {
        set((state) => ({
          expandedIds: new Set([...state.expandedIds, parentId])
        }));
      }

      toast.success(`分组 "${name}" 创建成功`);
      return group;
    } catch (error) {
      toast.error(`创建分组失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return null;
    }
  },

  updateGroup: async (id: GroupId, updates) => {
    try {
      const updated = await invoke<Group>('update_group', { id, ...updates });
      set((state) => ({
        groups: state.groups.map((g) => (g.id === id ? updated : g)),
      }));
      toast.success('分组更新成功');
    } catch (error) {
      toast.error(`更新分组失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  deleteGroup: async (id: GroupId) => {
    try {
      await invoke('delete_group', { id });
      set((state) => {
        // 递归删除所有子分组
        const deleteWithChildren = (groupId: GroupId, groups: Group[]): Group[] => {
          const children = groups.filter((g) => g.parentId === groupId);
          let remaining = groups.filter((g) => g.id !== groupId);
          for (const child of children) {
            remaining = deleteWithChildren(child.id, remaining);
          }
          return remaining;
        };

        const newGroups = deleteWithChildren(id, state.groups);
        const newExpanded = new Set(state.expandedIds);
        newExpanded.delete(id);

        return {
          groups: newGroups,
          selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
          expandedIds: newExpanded,
        };
      });
      toast.success('分组已删除');
    } catch (error) {
      toast.error(`删除分组失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- 排序操作 ----
  reorderGroups: async (dragId: GroupId, targetId: GroupId) => {
    try {
      const { groups } = get();
      const dragGroup = groups.find((g) => g.id === dragId);
      const targetGroup = groups.find((g) => g.id === targetId);

      if (!dragGroup || !targetGroup) return;

      // 检查是否尝试将父分组拖入其子分组
      if (get().isAncestor(dragId, targetId)) {
        toast.warning('不能将父分组移动到其子分组中');
        return;
      }

      // 构建新的排序数组
      const sameParent = dragGroup.parentId === targetGroup.parentId;
      const orders: Array<[GroupId, number]> = [];

      if (sameParent) {
        // 同级排序
        const siblings = groups
          .filter((g) => g.parentId === dragGroup.parentId)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        const dragIndex = siblings.findIndex((g) => g.id === dragId);
        const targetIndex = siblings.findIndex((g) => g.id === targetId);

        // 移除拖拽项
        const [removed] = siblings.splice(dragIndex, 1);
        // 插入到目标位置
        siblings.splice(targetIndex, 0, removed);

        // 生成新的排序
        siblings.forEach((g, index) => {
          orders.push([g.id, index]);
        });
      } else {
        // 跨级移动：将拖拽分组的 parentId 改为目标的 parentId
        await get().updateGroup(dragId, { parentId: targetGroup.parentId });

        // 重新排序同级的分组
        const siblings = groups
          .filter((g) => g.parentId === targetGroup.parentId && g.id !== dragId)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        const targetIndex = siblings.findIndex((g) => g.id === targetId);
        siblings.splice(targetIndex + 1, 0, dragGroup);

        siblings.forEach((g, index) => {
          orders.push([g.id, index]);
        });
      }

      await invoke('reorder_groups', { orders });

      set((state) => {
        const orderMap = new Map(orders);
        return {
          groups: state.groups.map((g) => {
            const newOrder = orderMap.get(g.id);
            return newOrder !== undefined ? { ...g, sortOrder: newOrder } : g;
          }),
        };
      });
    } catch (error) {
      toast.error(`排序失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },

  // ---- 展开/折叠状态 ----
  toggleExpand: (id: GroupId) => {
    set((state) => {
      const next = new Set(state.expandedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { expandedIds: next };
    });
  },

  expandAll: () => {
    set((state) => ({
      expandedIds: new Set(state.groups.map((g) => g.id))
    }));
  },

  collapseAll: () => {
    set({ expandedIds: new Set() });
  },

  // ---- 选择状态 ----
  selectGroup: (id: GroupId | null) => {
    set({ selectedGroupId: id });
  },

  // ---- 查询方法 ----
  getGroupTree: () => {
    return buildTree(get().groups);
  },

  getGroupById: (id: GroupId) => {
    return get().groups.find((g) => g.id === id);
  },

  getChildGroups: (parentId: GroupId | null) => {
    return get().groups
      .filter((g) => g.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getGroupPath: (id: GroupId) => {
    const tree = get().getGroupTree();
    const path = getGroupPathRecursive(tree, id);
    return path || [];
  },

  isAncestor: (ancestorId: GroupId, descendantId: GroupId) => {
    if (ancestorId === descendantId) return false;
    const tree = get().getGroupTree();
    return isAncestorRecursive(tree, ancestorId, descendantId);
  },

  // ---- 获取分组深度 ----
  getGroupDepth: (id: GroupId) => {
    const path = get().getGroupPath(id);
    return path.length - 1; // 根为0
  },

  // ---- 获取所有后代分组ID ----
  getDescendantIds: (id: GroupId | null) => {
    if (!id) return [];
    const tree = get().getGroupTree();
    const result: GroupId[] = [id];

    const collectDescendants = (groups: Group[]) => {
      for (const group of groups) {
        if (group.id === id) {
          // 找到目标，收集所有子节点
          const collectChildren = (children: Group[]) => {
            for (const child of children) {
              result.push(child.id);
              if (child.children && child.children.length > 0) {
                collectChildren(child.children);
              }
            }
          };
          if (group.children) {
            collectChildren(group.children);
          }
          return;
        }
        if (group.children && group.children.length > 0) {
          collectDescendants(group.children);
        }
      }
    };

    collectDescendants(tree);
    return result;
  },

  // ---- 移动分组到指定位置 ----
  moveGroup: async (dragId: GroupId, targetId: GroupId, position: 'before' | 'after' | 'inside') => {
    try {
      const { groups, isAncestor, getGroupDepth } = get();
      const dragGroup = groups.find((g) => g.id === dragId);
      const targetGroup = groups.find((g) => g.id === targetId);

      if (!dragGroup || !targetGroup) return;
      if (dragId === targetId) return;

      // 检查是否尝试将父分组拖入其子分组
      if (isAncestor(dragId, targetId)) {
        toast.warning('不能将父分组移动到其子分组中');
        return;
      }

      // 六级嵌套限制检查
      const MAX_DEPTH = 5; // 0-5 共6级

      if (position === 'inside') {
        // 拖入目标内部作为子分组
        const targetDepth = getGroupDepth(targetId);
        if (targetDepth >= MAX_DEPTH) {
          toast.warning('已达到最大嵌套层级（6级）');
          return;
        }

        // 更新 parentId
        await get().updateGroup(dragId, { parentId: targetId });

        // 重新排序：将 dragGroup 放到目标子分组的最后
        const targetChildren = groups.filter((g) => g.parentId === targetId);
        const maxOrder = targetChildren.length > 0
          ? Math.max(...targetChildren.map((g) => g.sortOrder))
          : -1;

        await invoke('update_group', { id: dragId, parentId: targetId, sortOrder: maxOrder + 1 });

        // 更新本地状态
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === dragId ? { ...g, parentId: targetId, sortOrder: maxOrder + 1 } : g
          ),
          // 自动展开目标分组
          expandedIds: new Set([...state.expandedIds, targetId]),
        }));

        toast.success('分组已移动');
      } else {
        // before 或 after：同级排序
        const newParentId = targetGroup.parentId;

        // 如果 parentId 改变，先更新
        if (dragGroup.parentId !== newParentId) {
          // 检查新层级的深度限制
          if (newParentId) {
            const newParentDepth = getGroupDepth(newParentId);
            if (newParentDepth >= MAX_DEPTH) {
              toast.warning('已达到最大嵌套层级（6级）');
              return;
            }
          }

          await get().updateGroup(dragId, { parentId: newParentId });
        }

        // 重新排序同级分组
        const siblings = groups
          .filter((g) => g.parentId === newParentId && g.id !== dragId)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        const targetIndex = siblings.findIndex((g) => g.id === targetId);
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;

        siblings.splice(insertIndex, 0, dragGroup);

        const orders: Array<[GroupId, number]> = siblings.map((g, index) => [g.id, index]);

        await invoke('reorder_groups', { orders });

        set((state) => {
          const orderMap = new Map(orders);
          return {
            groups: state.groups.map((g) => {
              const newOrder = orderMap.get(g.id);
              return newOrder !== undefined
                ? { ...g, sortOrder: newOrder, parentId: g.id === dragId ? newParentId : g.parentId }
                : g;
            }),
          };
        });

        toast.success('分组已移动');
      }
    } catch (error) {
      toast.error(`移动失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  },
}));
