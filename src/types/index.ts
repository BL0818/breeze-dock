// ============================================================
// BreezeNote 完整类型定义
// ============================================================

// ---- 基础类型 ----

/** 笔记 ID (UUID v4) */
export type NoteId = string;
/** 分组 ID */
export type GroupId = string;
/** 标签 ID */
export type TagId = string;
/** 笔记模板 */
export type NoteTemplate = 'blank' | 'todo' | 'note' | 'snippet' | 'idea';
/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'system';
/** 视图类型 */
export type ViewType = 'all' | 'starred' | 'archived' | 'trash' | 'group' | 'tag' | 'settings';
/** 排序字段 */
export type SortBy = 'updatedAt' | 'createdAt' | 'title' | 'sortOrder';
/** 排序方向 */
export type SortOrder = 'asc' | 'desc';
/** 语言 */
export type Language = 'zh-CN' | 'en-US';

// ---- 数据模型 ----

/** 笔记 */
export interface Note {
  id: NoteId;
  title: string;
  content: string;
  groupId: GroupId | null;
  tags: TagId[];
  template: NoteTemplate;
  isPinned: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  sortOrder: number;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  trashedAt: string | null;
}

/** 笔记历史版本 */
export interface NoteHistory {
  id: string;
  noteId: NoteId;
  title: string;
  content: string;
  createdAt: string;
}

/** 标签 */
export interface Tag {
  id: TagId;
  name: string;
  color: string;
  noteCount: number;
  createdAt: string;
}

/** 笔记分组 */
export interface Group {
  id: GroupId;
  name: string;
  parentId: GroupId | null;
  icon: string;
  sortOrder: number;
  children?: Group[];
  createdAt: string;
}

/** 悬浮窗配置 */
export interface FloatingConfig {
  noteId: NoteId;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  isPenetrable: boolean;
  isCollapsed: boolean;
  label?: string;
  isLocked?: boolean;
  securityLevel?: FloatingSecurityLevel;
  isIncognito?: boolean;
}

/** 悬浮窗安全层级 */
export enum FloatingSecurityLevel {
  Normal = 0,      // 普通：无任何保护
  Protected = 1,   // 受保护：需要密码
  HighSecurity = 2, // 高安全：密码 + 防截屏
}

/** 悬浮窗安全状态 */
export interface FloatingSecurityState {
  isLocked: boolean;
  passwordHash: string | null;
  securityLevel: FloatingSecurityLevel;
  isIncognito: boolean;
}

/** 安全状态 */
export interface SecurityState {
  screenCapturePrevented: boolean;
  debuggerDetected: boolean;
}

/** 待办项 */
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

/** 右键菜单项 */
export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
  icon?: string;
  children?: ContextMenuItem[];
}

// ---- API 交互类型 ----

/** 统一命令返回 */
export interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/** 分页结果 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

/** 笔记过滤条件 */
export interface NoteFilter {
  view: ViewType;
  groupId?: GroupId | null;
  tagId?: TagId | null;
  query?: string;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  pinnedOnly?: boolean;
}

/** 搜索结果 */
export interface SearchResult {
  note: Note;
  score: number;
  highlights: SearchHighlight[];
}

/** 搜索高亮 */
export interface SearchHighlight {
  field: 'title' | 'content';
  text: string;
  indices: [number, number][];
}

// ---- 设置类型 ----

/** 快捷键设置 */
export interface ShortcutSettings {
  createNote: boolean;       // Ctrl+Shift+N 新建笔记
  globalSearch: boolean;     // Ctrl+Shift+F 全局搜索
  showMainWindow: boolean;   // Ctrl+Shift+B 呼出主窗口
  createFloating: boolean;  // Ctrl+Shift+L 新建悬浮标签
}

/** 安全设置 */
export interface SecuritySettings {
  passwordHash: string | null;        // 密码哈希值
  windowsHelloEnabled: boolean;       // Windows Hello 开关
  incognitoMode: boolean;              // 无痕模式
  encryptionEnabled: boolean;         // 加密开关
  autoLockTimeout: number;            // 自动锁定时间(分钟), 0 = 永不
  lastLockTime: string | null;        // 上次锁定时间
}

/** 应用设置 */
export interface AppSettings {
  theme: ThemeMode;
  fontSize: number;
  autoSaveDelay: number;
  language: Language;
  enablePassword: boolean;
  startupOnBoot: boolean;
  showTrayIcon: boolean;
  enableNotifications: boolean;
  closeToTray: boolean;        // 关闭时最小化到托盘还是直接退出
  confirmBeforeClose: boolean; // 关闭时是否显示确认对话框
  window: WindowSettings;
  editor: EditorSettings;
  colors: ThemeColors;
  shortcuts: ShortcutSettings;
  security: SecuritySettings;
}

/** 窗口设置 */
export interface WindowSettings {
  width: number;
  height: number;
  x: number;
  y: number;
  isMaximized: boolean;
  sidebarWidth: number;
  sidebarVisible: boolean;
}

/** 编辑器设置 */
export interface EditorSettings {
  showLineNumbers: boolean;
  spellCheck: boolean;
  tabSize: number;
  autoClosingBrackets: boolean;
  wordWrap: boolean;
}

/** 主题颜色配置 */
export interface ThemeColors {
  primary: string;      // 主题色
  success: string;      // 成功色
  warning: string;      // 警告色
  error: string;        // 错误色
  info: string;         // 信息色
}

/** 预设主题方案 */
export interface ThemePreset {
  id: string;
  name: string;
  colors: ThemeColors;
}

/** Tailwind CSS 颜色 (500 色阶) */
export const TAILWIND_COLORS = {
  indigo: '#6366f1',
  violet: '#8b5cf6',
  fuchsia: '#d946ef',
  rose: '#f43f5e',
  amber: '#f59e0b',
  sky: '#0ea5e9',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  emerald: '#10b981',
  slate: '#64748b',
  zinc: '#71717a',
  stone: '#78716c',
} as const;

/** 默认主题颜色 (Indigo) */
export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: TAILWIND_COLORS.indigo,
  success: TAILWIND_COLORS.emerald,
  warning: TAILWIND_COLORS.amber,
  error: TAILWIND_COLORS.rose,
  info: TAILWIND_COLORS.sky,
};

/** 预设主题方案 (基于 Tailwind CSS) */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'indigo',
    name: 'Indigo',
    colors: {
      primary: TAILWIND_COLORS.indigo,
      success: TAILWIND_COLORS.emerald,
      warning: TAILWIND_COLORS.amber,
      error: TAILWIND_COLORS.rose,
      info: TAILWIND_COLORS.sky,
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    colors: {
      primary: TAILWIND_COLORS.violet,
      success: TAILWIND_COLORS.emerald,
      warning: TAILWIND_COLORS.amber,
      error: TAILWIND_COLORS.rose,
      info: TAILWIND_COLORS.sky,
    },
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia',
    colors: {
      primary: TAILWIND_COLORS.fuchsia,
      success: TAILWIND_COLORS.emerald,
      warning: TAILWIND_COLORS.amber,
      error: TAILWIND_COLORS.rose,
      info: TAILWIND_COLORS.sky,
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      primary: TAILWIND_COLORS.rose,
      success: TAILWIND_COLORS.emerald,
      warning: TAILWIND_COLORS.amber,
      error: TAILWIND_COLORS.fuchsia,
      info: TAILWIND_COLORS.sky,
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      primary: TAILWIND_COLORS.emerald,
      success: TAILWIND_COLORS.emerald,
      warning: TAILWIND_COLORS.amber,
      error: TAILWIND_COLORS.rose,
      info: TAILWIND_COLORS.sky,
    },
  },
];

/** 默认设置 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  fontSize: 14,
  autoSaveDelay: 500,
  language: 'zh-CN',
  enablePassword: false,
  startupOnBoot: false,
  showTrayIcon: true,
  enableNotifications: true,
  closeToTray: true,        // 默认最小化到托盘
  confirmBeforeClose: true, // 默认显示确认对话框
  window: {
    width: 1080, height: 720, x: 100, y: 100,
    isMaximized: false, sidebarWidth: 280, sidebarVisible: true,
  },
  editor: {
    showLineNumbers: false, spellCheck: false,
    tabSize: 2, autoClosingBrackets: true, wordWrap: true,
  },
  colors: DEFAULT_THEME_COLORS,
  shortcuts: {
    createNote: true,
    globalSearch: true,
    showMainWindow: true,
    createFloating: true,
  },
  security: {
    passwordHash: null,
    windowsHelloEnabled: false,
    incognitoMode: false,
    encryptionEnabled: false,
    autoLockTimeout: 5,
    lastLockTime: null,
  },
};

// ---- UI 状态类型 ----

/** Toast 消息 */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
  createdAt: number;
}

/** 弹窗配置 */
export interface ModalConfig {
  id: string;
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  variant?: 'confirm' | 'alert' | 'custom';
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

/** 右键菜单状态 */
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  targetId?: string;
}

// ---- 标签颜色常量 ----

/** 预定义标签颜色 - Tailwind CSS 配色 */
export const TAG_COLORS = [
  TAILWIND_COLORS.indigo,
  TAILWIND_COLORS.violet,
  TAILWIND_COLORS.fuchsia,
  TAILWIND_COLORS.rose,
  TAILWIND_COLORS.amber,
  TAILWIND_COLORS.sky,
  TAILWIND_COLORS.cyan,
  TAILWIND_COLORS.teal,
  TAILWIND_COLORS.emerald,
  TAILWIND_COLORS.slate,
] as const;

/** 获取随机标签颜色 */
export function getRandomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}
