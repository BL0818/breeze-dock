import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { FloatingConfig, ViewType, ToastMessage, ModalConfig, ContextMenuState, ContextMenuItem } from '../types';

interface UIState {
  sidebarOpen: boolean;
  searchOpen: boolean;
  lockScreenVisible: boolean;
  currentView: ViewType;
  searchQuery: string;
  floatingWindows: FloatingConfig[];
  toasts: ToastMessage[];
  modals: ModalConfig[];
  contextMenu: ContextMenuState;
  closeConfirmModalOpen: boolean;
  isLocked: boolean;
  isIncognito: boolean;
}

interface UIActions {
  // 侧边栏
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  // 搜索
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  // 视图
  setCurrentView: (view: ViewType) => void;
  // 锁屏
  showLockScreen: () => void;
  hideLockScreen: () => void;
  // 悬浮窗
  addFloating: (config: FloatingConfig) => void;
  removeFloating: (noteId: string) => void;
  updateFloating: (noteId: string, updates: Partial<FloatingConfig>) => void;
  toggleFloatingCollapse: (noteId: string) => void;
  toggleFloatingPenetrable: (noteId: string) => void;
  clearAllFloating: () => void;
  // Toast
  showToast: (type: ToastMessage['type'], message: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  // 弹窗
  openModal: (config: Omit<ModalConfig, 'id'>) => string;
  closeModal: (id: string) => void;
  clearAllModals: () => void;
  // 右键菜单
  openContextMenu: (x: number, y: number, items: ContextMenuItem[], targetId?: string) => void;
  closeContextMenu: () => void;
  // 关闭确认弹窗
  openCloseConfirmModal: () => void;
  closeCloseConfirmModal: () => void;
  // 锁屏与无痕
  lockApp: () => void;
  unlockApp: () => void;
  setIncognito: (incognito: boolean) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  searchOpen: false,
  lockScreenVisible: false,
  currentView: 'all',
  searchQuery: '',
  floatingWindows: [],
  toasts: [],
  modals: [],
  contextMenu: { visible: false, x: 0, y: 0, items: [] },
  closeConfirmModalOpen: false,
  isLocked: false,
  isIncognito: false,

  // ---- 侧边栏 ----
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // ---- 搜索 ----
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false, searchQuery: '' }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // ---- 视图 ----
  setCurrentView: (view) => set({ currentView: view }),

  // ---- 锁屏 ----
  showLockScreen: () => set({ lockScreenVisible: true }),
  hideLockScreen: () => set({ lockScreenVisible: false }),

  // ---- 悬浮窗 ----
  addFloating: (config) => set((s) => ({ floatingWindows: [...s.floatingWindows, config] })),
  removeFloating: (noteId) => set((s) => ({ floatingWindows: s.floatingWindows.filter((w) => w.noteId !== noteId) })),
  updateFloating: (noteId, updates) => set((s) => ({
    floatingWindows: s.floatingWindows.map((w) => (w.noteId === noteId ? { ...w, ...updates } : w)),
  })),
  toggleFloatingCollapse: (noteId) => set((s) => ({
    floatingWindows: s.floatingWindows.map((w) => (w.noteId === noteId ? { ...w, isCollapsed: !w.isCollapsed } : w)),
  })),
  toggleFloatingPenetrable: (noteId) => set((s) => ({
    floatingWindows: s.floatingWindows.map((w) => (w.noteId === noteId ? { ...w, isPenetrable: !w.isPenetrable } : w)),
  })),
  clearAllFloating: () => set({ floatingWindows: [] }),

  // ---- Toast ----
  showToast: (type, message, duration = 3000) => {
    const id = uuidv4();
    const toast: ToastMessage = { id, type, message, duration, createdAt: Date.now() };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ---- 弹窗 ----
  openModal: (config) => {
    const id = uuidv4();
    set((s) => ({ modals: [...s.modals, { ...config, id }] }));
    return id;
  },
  closeModal: (id) => set((s) => ({ modals: s.modals.filter((m) => m.id !== id) })),
  clearAllModals: () => set({ modals: [] }),

  // ---- 右键菜单 ----
  openContextMenu: (x, y, items, targetId) => set({
    contextMenu: { visible: true, x, y, items, targetId },
  }),
  closeContextMenu: () => set({ contextMenu: { visible: false, x: 0, y: 0, items: [] } }),

  // ---- 关闭确认弹窗 ----
  openCloseConfirmModal: () => set({ closeConfirmModalOpen: true }),
  closeCloseConfirmModal: () => set({ closeConfirmModalOpen: false }),

  // ---- 锁屏与无痕 ----
  lockApp: () => set({ isLocked: true, lockScreenVisible: true }),
  unlockApp: () => set({ isLocked: false, lockScreenVisible: false }),
  setIncognito: (incognito) => set({ isIncognito: incognito }),
}));
