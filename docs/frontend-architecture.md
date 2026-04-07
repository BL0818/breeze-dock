# BreezeNote 前端架构规范

> 本文档定义了 BreezeNote 前端的完整架构规范，所有开发人员必须严格遵守。
> 技术栈：Tauri v2 + React 18 + TypeScript + UnoCSS + Zustand + react-router-dom v6 + Fuse.js
> 组件命名：所有 React 组件必须以 `Br` 前缀命名。

---

## 1. React 路由规划

### 1.1 路由总览

```
/              → BrMainLayout (侧边栏 + 编辑器)
/search        → BrSearchPage (全局搜索)
/trash         → BrTrashPage (回收站)
/settings      → BrSettingsPage (设置页)
/lock          → BrLockScreen (锁屏页)
```

### 1.2 路由详细定义

| 路由路径 | 页面组件 | 需要认证 | 布局类型 | 嵌套路由 |
|----------|---------|---------|---------|---------|
| `/` | `BrMainLayout` | 是 | 侧边栏布局 | `BrNoteList` + `BrEditor` |
| `/search` | `BrSearchPage` | 是 | 全屏覆盖层 | 无 |
| `/trash` | `BrTrashPage` | 是 | 侧边栏布局 | 无 |
| `/settings` | `BrSettingsPage` | 是 | 侧边栏布局 | 无 |
| `/lock` | `BrLockScreen` | 否 | 全屏独立窗口 | 无 |

### 1.3 路由层级结构

```
<BrowserRouter>
  <BrAppShell>                          // 全局壳：主题、全局样式
    <Routes>
      {/* 锁屏路由 - 优先匹配，无布局包装 */}
      <Route path="/lock" element={<BrLockScreen />} />

      {/* 受保护路由 - 需通过认证检查 */}
      <Route element={<BrAuthGuard />}>
        <Route element={<BrWindowFrame />}>  // 标题栏 + 侧边栏骨架
          <Route path="/" element={<BrMainLayout />}>
            {/* 嵌套：笔记列表 + 编辑器 */}
            <Route index element={<BrNoteList />} />
            <Route path="note/:noteId" element={<BrEditor />} />
          </Route>
          <Route path="/search" element={<BrSearchPage />} />
          <Route path="/trash" element={<BrTrashPage />} />
          <Route path="/settings" element={<BrSettingsPage />} />
        </Route>
      </Route>

      {/* 兜底 */}
      <Route path="*" element={<BrNavigateHome />} />
    </Routes>
  </BrAppShell>
</BrowserRouter>
```

### 1.4 路由守卫逻辑

```
BrAuthGuard 认证流程：
  1. 从 useSettingStore 读取 enablePassword
  2. 若 enablePassword === false → 直接放行
  3. 若 enablePassword === true → 从 useUIStore 读取 lockScreenVisible
  4. 若 lockScreenVisible === true → 重定向到 /lock
  5. 若 lockScreenVisible === false → 放行
```

### 1.5 路由组件清单

| 组件名 | 文件路径 | 职责 |
|--------|---------|------|
| `BrAppShell` | `src/App.tsx` | 全局壳，主题注入、CSS 初始化 |
| `BrAuthGuard` | `src/components/layout/BrAuthGuard.tsx` | 认证守卫，Outlet 包装 |
| `BrWindowFrame` | `src/components/layout/BrWindowFrame.tsx` | 窗口骨架（标题栏 + 侧边栏 + Outlet） |
| `BrMainLayout` | `src/components/layout/BrMainLayout.tsx` | 主内容区（笔记列表 + 编辑器双栏） |
| `BrNoteList` | `src/features/editor/BrNoteList.tsx` | 左侧笔记列表 |
| `BrEditor` | `src/features/editor/BrEditor.tsx` | 右侧编辑器 |
| `BrSearchPage` | `src/features/search/BrSearchPage.tsx` | 搜索页面 |
| `BrTrashPage` | `src/features/trash/BrTrashView.tsx` | 回收站页面 |
| `BrSettingsPage` | `src/features/settings/BrSettingsPage.tsx` | 设置页面 |
| `BrLockScreen` | `src/features/security/BrLockScreen.tsx` | 锁屏页面 |
| `BrNavigateHome` | `src/components/layout/BrNavigateHome.tsx` | 兜底重定向到 `/` |

---

## 2. 全局 TypeScript 类型定义

> 文件位置：`src/types/index.ts`

### 2.1 基础类型（Basic Types）

```typescript
// ============================================================
// 基础类型别名
// ============================================================

/** 笔记唯一标识 (UUID v4) */
type NoteId = string;

/** 分组唯一标识 (UUID v4) */
type GroupId = string;

/** 标签唯一标识 (UUID v4) */
type TagId = string;

/** 笔记模板类型 */
type NoteTemplate = 'blank' | 'todo' | 'note' | 'snippet' | 'idea';

/** 主题模式 */
type ThemeMode = 'light' | 'dark' | 'system';

/** 视图类型 - 决定侧边栏当前展示的笔记筛选 */
type ViewType = 'all' | 'starred' | 'archived' | 'trash' | 'group';

/** 排序方式 */
type SortBy = 'updatedAt' | 'createdAt' | 'title' | 'sortOrder';

/** 排序方向 */
type SortOrder = 'asc' | 'desc';

/** 语言 */
type Language = 'zh-CN' | 'en-US';
```

### 2.2 数据模型（Data Models）

```typescript
// ============================================================
// 数据模型
// ============================================================

/** 笔记 - 核心数据实体 */
interface Note {
  /** 唯一标识 (UUID) */
  id: NoteId;
  /** 标题 */
  title: string;
  /** 正文内容 (Markdown / JSON) */
  content: string;
  /** 所属分组 ID */
  groupId: GroupId | null;
  /** 关联标签 ID 列表 */
  tags: TagId[];
  /** 使用的模板 */
  template: NoteTemplate;
  /** 是否置顶 */
  isPinned: boolean;
  /** 是否星标 */
  isStarred: boolean;
  /** 是否已归档 */
  isArchived: boolean;
  /** 是否已移入回收站 */
  isTrashed: boolean;
  /** 手动排序序号 */
  sortOrder: number;
  /** 正文字数统计 */
  wordCount: number;
  /** 创建时间 (ISO 8601) */
  createdAt: string;
  /** 最后更新时间 (ISO 8601) */
  updatedAt: string;
  /** 移入回收站时间 (ISO 8601) */
  trashedAt: string | null;
}

/** 笔记历史版本 */
interface NoteHistory {
  /** 唯一标识 */
  id: string;
  /** 所属笔记 ID */
  noteId: NoteId;
  /** 历史标题快照 */
  title: string;
  /** 历史正文快照 */
  content: string;
  /** 快照时间 (ISO 8601) */
  createdAt: string;
}

/** 标签 */
interface Tag {
  /** 唯一标识 */
  id: TagId;
  /** 标签名称 */
  name: string;
  /** 标签颜色 (十六进制) */
  color: string;
  /** 关联笔记数量（计算字段） */
  noteCount: number;
  /** 创建时间 (ISO 8601) */
  createdAt: string;
}

/** 分组/文件夹 - 支持树形嵌套 */
interface Group {
  /** 唯一标识 */
  id: GroupId;
  /** 分组名称 */
  name: string;
  /** 父分组 ID (null 表示根级) */
  parentId: GroupId | null;
  /** 图标名称 (UnoCSS Icons) */
  icon: string;
  /** 排序序号 */
  sortOrder: number;
  /** 子分组列表（树形嵌套） */
  children?: Group[];
  /** 创建时间 (ISO 8601) */
  createdAt: string;
}

/** 悬浮窗配置 */
interface FloatingConfig {
  /** 关联笔记 ID */
  noteId: NoteId;
  /** X 坐标 (px) */
  x: number;
  /** Y 坐标 (px) */
  y: number;
  /** 窗口宽度 (px) */
  width: number;
  /** 窗口高度 (px) */
  height: number;
  /** 透明度 (0~1) */
  opacity: number;
  /** 是否启用鼠标穿透 */
  isPenetrable: boolean;
  /** 是否已折叠 */
  isCollapsed: boolean;
}

/** 待办项 (用于 todo 模板) */
interface TodoItem {
  /** 唯一标识 */
  id: string;
  /** 待办文本 */
  text: string;
  /** 是否已完成 */
  completed: boolean;
}

/** 右键菜单项 */
interface ContextMenuItem {
  /** 显示文本 */
  label: string;
  /** 快捷键提示文本 (如 "Ctrl+N") */
  shortcut?: string;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否为分割线（此字段为 true 时 label 失效） */
  divider?: boolean;
  /** 图标名称 (UnoCSS Icons) */
  icon?: string;
  /** 子菜单（支持多级嵌套） */
  children?: ContextMenuItem[];
}
```

### 2.3 API 交互类型（API Types）

```typescript
// ============================================================
// API 交互类型 - 与 Tauri 后端通信
// ============================================================

/** 统一命令返回格式 */
interface CommandResult<T> {
  /** 是否成功 */
  success: boolean;
  /** 返回数据 */
  data: T | null;
  /** 错误信息 */
  error: string | null;
}

/** 分页结果 */
interface PaginatedResult<T> {
  /** 数据列表 */
  items: T[];
  /** 总条数 */
  total: number;
  /** 当前页码 (从 1 开始) */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 是否有下一页 */
  hasNext: boolean;
}

/** 笔记过滤条件 */
interface NoteFilter {
  /** 按视图类型筛选 */
  view: ViewType;
  /** 按分组筛选 */
  groupId?: GroupId | null;
  /** 按标签筛选 */
  tagId?: TagId | null;
  /** 搜索关键词 */
  query?: string;
  /** 排序字段 */
  sortBy?: SortBy;
  /** 排序方向 */
  sortOrder?: SortOrder;
  /** 是否仅显示置顶 */
  pinnedOnly?: boolean;
}

/** 搜索结果条目 */
interface SearchResult {
  /** 匹配的笔记 */
  note: Note;
  /** 匹配度分数 (Fuse.js, 0=完全匹配) */
  score: number;
  /** 高亮片段列表 */
  highlights: SearchHighlight[];
}

/** 搜索高亮片段 */
interface SearchHighlight {
  /** 字段名 (title / content) */
  field: 'title' | 'content';
  /** 原始文本片段 */
  text: string;
  /** 匹配区间列表 [start, end] */
  indices: [number, number][];
}
```

### 2.4 设置类型（Settings Types）

```typescript
// ============================================================
// 应用设置类型
// ============================================================

/** 完整应用设置 */
interface AppSettings {
  /** 主题模式 */
  theme: ThemeMode;
  /** 字体大小 (px, 范围 12~24) */
  fontSize: number;
  /** 自动保存延迟 (ms, 范围 200~3000) */
  autoSaveDelay: number;
  /** 界面语言 */
  language: Language;
  /** 是否启用密码保护 */
  enablePassword: boolean;
  /** 是否开机自启动 */
  startupOnBoot: boolean;
  /** 窗口设置 */
  window: WindowSettings;
  /** 编辑器设置 */
  editor: EditorSettings;
}

/** 窗口相关设置 */
interface WindowSettings {
  /** 窗口宽度 */
  width: number;
  /** 窗口高度 */
  height: number;
  /** 窗口 X 坐标 */
  x: number;
  /** 窗口 Y 坐标 */
  y: number;
  /** 是否最大化 */
  isMaximized: boolean;
  /** 侧边栏宽度 (px) */
  sidebarWidth: number;
  /** 是否显示侧边栏 */
  sidebarVisible: boolean;
}

/** 编辑器设置 */
interface EditorSettings {
  /** 是否显示行号 */
  showLineNumbers: boolean;
  /** 是否开启拼写检查 */
  spellCheck: boolean;
  /** Tab 缩进空格数 */
  tabSize: number;
  /** 是否启用自动配对括号 */
  autoClosingBrackets: boolean;
  /** 是否启用自动换行 */
  wordWrap: boolean;
}
```

### 2.5 UI 状态类型（UI State Types）

```typescript
// ============================================================
// UI 状态类型
// ============================================================

/** Toast 提示消息 */
interface ToastMessage {
  /** 唯一标识 */
  id: string;
  /** 消息类型 */
  type: 'success' | 'error' | 'warning' | 'info';
  /** 消息文本 */
  message: string;
  /** 显示时长 (ms, 0=手动关闭) */
  duration: number;
  /** 创建时间戳 */
  createdAt: number;
}

/** 弹窗配置 */
interface ModalConfig {
  /** 唯一标识 */
  id: string;
  /** 弹窗标题 */
  title: string;
  /** 弹窗内容 (ReactNode 序列化描述) */
  content: string;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 取消按钮文本 */
  cancelText?: string;
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 确认回调 */
  onConfirm?: () => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 关闭回调 */
  onClose?: () => void;
  /** 弹窗类型 */
  variant?: 'confirm' | 'alert' | 'custom';
}

/** 右键菜单状态 */
interface ContextMenuState {
  /** 是否可见 */
  visible: boolean;
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 菜单项列表 */
  items: ContextMenuItem[];
  /** 关联的数据 ID (如笔记 ID) */
  targetId?: string;
}
```

### 2.6 默认值常量

```typescript
// ============================================================
// 默认值常量
// ============================================================

const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  fontSize: 14,
  autoSaveDelay: 500,
  language: 'zh-CN',
  enablePassword: false,
  startupOnBoot: false,
  window: {
    width: 1080,
    height: 720,
    x: 100,
    y: 100,
    isMaximized: false,
    sidebarWidth: 280,
    sidebarVisible: true,
  },
  editor: {
    showLineNumbers: false,
    spellCheck: false,
    tabSize: 2,
    autoClosingBrackets: true,
    wordWrap: true,
  },
};
```

---

## 3. Zustand 状态管理规划

> 所有 Store 文件位于 `src/stores/` 目录。

### 3.1 useNoteStore

**文件路径**: `src/stores/useNoteStore.ts`

#### State 类型定义

```typescript
interface NoteState {
  /** 所有笔记列表 */
  notes: Note[];
  /** 当前选中笔记 ID */
  currentNoteId: NoteId | null;
  /** 笔记历史记录 */
  noteHistory: NoteHistory[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 当前过滤条件 */
  filter: NoteFilter;
}
```

#### Actions 方法清单

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `loadNotes` | `filter?: NoteFilter` | `Promise<void>` | 从 Tauri 后端加载笔记列表，应用过滤条件 |
| `createNote` | `template?: NoteTemplate, groupId?: GroupId \| null` | `Note` | 新建笔记，插入到列表头部并选中 |
| `updateNote` | `id: NoteId, updates: Partial<Note>` | `void` | 更新笔记字段，自动刷新 updatedAt |
| `deleteNote` | `id: NoteId` | `Promise<void>` | 永久删除笔记（含关联历史），调用 Tauri 后端 |
| `trashNote` | `id: NoteId` | `void` | 移入回收站，设置 isTrashed=true 和 trashedAt |
| `restoreNote` | `id: NoteId` | `void` | 从回收站恢复，清除 isTrashed 和 trashedAt |
| `pinNote` | `id: NoteId` | `void` | 切换置顶状态 |
| `starNote` | `id: NoteId` | `void` | 切换星标状态 |
| `archiveNote` | `id: NoteId` | `void` | 切换归档状态 |
| `reorderNotes` | `fromIndex: number, toIndex: number` | `void` | 拖拽排序，更新 sortOrder 字段 |
| `searchNotes` | `query: string` | `SearchResult[]` | 基于 Fuse.js 的模糊搜索，返回高亮结果 |
| `loadHistory` | `noteId: NoteId` | `Promise<void>` | 加载指定笔记的历史版本列表 |
| `rollbackNote` | `noteId: NoteId, historyId: string` | `void` | 回滚到指定历史版本，当前内容先存历史 |
| `emptyTrash` | — | `Promise<void>` | 清空回收站，调用 Tauri 后端批量删除 |
| `setFilter` | `filter: Partial<NoteFilter>` | `void` | 更新过滤条件并重新加载 |
| `selectNote` | `id: NoteId \| null` | `void` | 选中/取消选中笔记 |

---

### 3.2 useGroupStore

**文件路径**: `src/stores/useGroupStore.ts`

#### State 类型定义

```typescript
interface GroupState {
  /** 分组列表（扁平结构，通过 parentId 构建树） */
  groups: Group[];
  /** 当前展开的分组 ID 集合 */
  expandedGroupIds: Set<GroupId>;
}
```

#### Actions 方法清单

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `loadGroups` | — | `Promise<void>` | 从 Tauri 后端加载全部分组 |
| `createGroup` | `name: string, parentId?: GroupId \| null, icon?: string` | `Group` | 新建分组，计算 sortOrder |
| `updateGroup` | `id: GroupId, updates: Partial<Pick<Group, 'name' \| 'icon' \| 'parentId'>>` | `void` | 更新分组属性 |
| `deleteGroup` | `id: GroupId` | `Promise<void>` | 删除分组，其下笔记的 groupId 置 null |
| `reorderGroups` | `fromIndex: number, toIndex: number` | `void` | 拖拽排序，更新 sortOrder |
| `toggleExpand` | `id: GroupId` | `void` | 切换分组展开/折叠 |
| `getGroupTree` | — | `Group[]` | 计算属性：将扁平列表转为树形结构返回 |

---

### 3.3 useTagStore

**文件路径**: `src/stores/useTagStore.ts`

#### State 类型定义

```typescript
interface TagState {
  /** 所有标签列表 */
  tags: Tag[];
  /** 当前选中的标签 ID (用于按标签筛选) */
  selectedTagId: TagId | null;
}
```

#### Actions 方法清单

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `loadTags` | — | `Promise<void>` | 从 Tauri 后端加载全部标签 |
| `createTag` | `name: string, color: string` | `Tag` | 新建标签 |
| `updateTag` | `id: TagId, updates: Partial<Pick<Tag, 'name' \| 'color'>>` | `void` | 更新标签属性 |
| `deleteTag` | `id: TagId` | `Promise<void>` | 删除标签，清除关联笔记的 tags 引用 |
| `addNoteTag` | `noteId: NoteId, tagId: TagId` | `void` | 为笔记添加标签 |
| `removeNoteTag` | `noteId: NoteId, tagId: TagId` | `void` | 从笔记移除标签 |
| `selectTag` | `id: TagId \| null` | `void` | 选中标签用于筛选，null 取消筛选 |

---

### 3.4 useSettingStore

**文件路径**: `src/stores/useSettingStore.ts`

**持久化策略**: 通过 localStorage 持久化，key 为 `breezenote-settings`。

#### State 类型定义

```typescript
interface SettingState {
  /** 完整应用设置 */
  settings: AppSettings;
}
```

#### Actions 方法清单

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `loadSettings` | — | `void` | 从 localStorage 读取设置，合并默认值 |
| `updateSetting` | `updates: Partial<AppSettings>` | `void` | 部分更新设置项并持久化 |
| `resetSettings` | — | `void` | 重置为默认设置并持久化 |
| `toggleTheme` | — | `void` | 在 light/dark/system 之间循环切换 |
| `setTheme` | `theme: ThemeMode` | `void` | 直接设置主题 |
| `setFontSize` | `size: number` | `void` | 设置字体大小 (12~24) |
| `setAutoSaveDelay` | `delay: number` | `void` | 设置自动保存延迟 (200~3000ms) |
| `setLanguage` | `language: Language` | `void` | 设置界面语言 |
| `togglePassword` | — | `void` | 切换密码保护开关 |
| `toggleStartupOnBoot` | — | `void` | 切换开机自启动 |
| `updateWindowSettings` | `updates: Partial<WindowSettings>` | `void` | 更新窗口设置 |
| `updateEditorSettings` | `updates: Partial<EditorSettings>` | `void` | 更新编辑器设置 |

---

### 3.5 useUIStore

**文件路径**: `src/stores/useUIStore.ts`

#### State 类型定义

```typescript
interface UIState {
  /** 侧边栏是否展开 */
  sidebarOpen: boolean;
  /** 全局搜索是否打开 */
  searchOpen: boolean;
  /** 搜索关键词 */
  searchQuery: string;
  /** 当前侧边栏视图类型 */
  currentView: ViewType;
  /** 悬浮窗口列表 */
  floatingWindows: FloatingConfig[];
  /** 锁屏界面是否可见 */
  lockScreenVisible: boolean;
  /** 右键菜单状态 */
  contextMenu: ContextMenuState;
  /** Toast 消息队列 */
  toasts: ToastMessage[];
  /** 弹窗栈 */
  modals: ModalConfig[];
}
```

#### Actions 方法清单

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `toggleSidebar` | — | `void` | 切换侧边栏展开/折叠 |
| `setSidebarOpen` | `open: boolean` | `void` | 设置侧边栏状态 |
| `openSearch` | — | `void` | 打开全局搜索面板 |
| `closeSearch` | — | `void` | 关闭全局搜索面板 |
| `setSearchQuery` | `query: string` | `void` | 更新搜索关键词 |
| `setCurrentView` | `view: ViewType` | `void` | 切换当前视图 |
| `addFloating` | `config: FloatingConfig` | `void` | 添加悬浮窗口 |
| `removeFloating` | `noteId: NoteId` | `void` | 移除悬浮窗口 |
| `updateFloating` | `noteId: NoteId, updates: Partial<FloatingConfig>` | `void` | 更新悬浮窗口配置 |
| `toggleFloatingCollapse` | `noteId: NoteId` | `void` | 切换悬浮窗折叠状态 |
| `toggleFloatingPenetrable` | `noteId: NoteId` | `void` | 切换悬浮窗鼠标穿透 |
| `showLockScreen` | — | `void` | 显示锁屏界面 |
| `hideLockScreen` | — | `void` | 隐藏锁屏界面（认证通过后调用） |
| `showToast` | `type, message, duration?` | `string` | 显示 Toast，返回 Toast ID |
| `dismissToast` | `id: string` | `void` | 关闭指定 Toast |
| `openContextMenu` | `x: number, y: number, items: ContextMenuItem[], targetId?: string` | `void` | 打开右键菜单 |
| `closeContextMenu` | — | `void` | 关闭右键菜单 |
| `openModal` | `config: Omit<ModalConfig, 'id'>` | `string` | 打开弹窗，返回 Modal ID |
| `closeModal` | `id: string` | `void` | 关闭指定弹窗 |
| `clearAllModals` | — | `void` | 关闭所有弹窗 |

---

### 3.6 Store 依赖关系

```
useSettingStore (独立，无依赖)
     |
     v
useUIStore (依赖 settings 判断认证)
     |
     v
useNoteStore (依赖 UI 状态进行路由/视图切换)
useGroupStore (独立，被 NoteStore 引用 groupId)
useTagStore (独立，被 NoteStore 引用 tagId)
```

**Store 初始化顺序**:
1. `useSettingStore` -- 最先初始化，加载设置和主题
2. `useUIStore` -- 初始化 UI 状态
3. `useGroupStore` -- 加载分组数据
4. `useTagStore` -- 加载标签数据
5. `useNoteStore` -- 最后初始化，加载笔记（可能需要 groupId 过滤）

---

## 4. package.json 依赖清单

> 文件路径：项目根目录 `package.json`

```json
{
  "name": "breeze-note",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx --fix"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0",
    "dayjs": "^1.11.10",
    "fuse.js": "^6.6.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "uuid": "^9.0.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@types/uuid": "^9.0.7",
    "@unocss/preset-icons": "^0.58.3",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "unocss": "^0.58.3",
    "vite": "^4.5.1"
  }
}
```

### 4.1 依赖用途说明

| 包名 | 版本 | 用途 |
|------|------|------|
| `react` | ^18.2.0 | UI 框架核心 |
| `react-dom` | ^18.2.0 | React DOM 渲染器 |
| `react-router-dom` | ^6.20.0 | 客户端路由（嵌套路由、守卫） |
| `zustand` | ^4.4.7 | 轻量状态管理，替代 Redux |
| `fuse.js` | ^6.6.2 | 前端模糊搜索引擎 |
| `@tauri-apps/api` | ^2.0.0 | Tauri v2 前端 API（invoke、事件监听） |
| `@tauri-apps/plugin-shell` | ^2.0.0 | Tauri v2 Shell 插件（打开外部链接等） |
| `uuid` | ^9.0.0 | UUID v4 生成器（笔记/分组 ID） |
| `dayjs` | ^1.11.10 | 轻量日期格式化（替代 moment） |
| `typescript` | ^5.3.3 | 类型检查 |
| `vite` | ^4.5.1 | 构建工具 + HMR 开发服务器 |
| `unocss` | ^0.58.3 | 原子化 CSS 引擎（iOS 风格设计系统） |
| `@unocss/preset-icons` | ^0.58.3 | UnoCSS 图标预设 |
| `@vitejs/plugin-react` | ^4.2.1 | Vite React 支持（Fast Refresh） |
| `@tauri-apps/cli` | ^2.0.0 | Tauri v2 CLI（dev/build） |
| `@types/react` | ^18.2.45 | React 类型定义 |
| `@types/react-dom` | ^18.2.18 | ReactDOM 类型定义 |
| `@types/uuid` | ^9.0.7 | uuid 类型定义 |

### 4.2 npm scripts 说明

| 脚本 | 命令 | 用途 |
|------|------|------|
| `dev` | `vite` | 启动前端开发服务器 (port 1420) |
| `build` | `tsc && vite build` | 类型检查 + 生产构建 |
| `preview` | `vite preview` | 预览生产构建产物 |
| `tauri` | `tauri` | Tauri CLI 代理 |
| `tauri:dev` | `tauri dev` | 启动 Tauri 开发模式（前端 + Rust） |
| `tauri:build` | `tauri build` | Tauri 生产构建（生成安装包） |
| `type-check` | `tsc --noEmit` | 仅类型检查，不输出文件 |
| `lint` | `eslint src --ext .ts,.tsx --fix` | ESLint 检查并自动修复 |

---

## 附录：目录结构与文件映射

```
src/
├── types/
│   └── index.ts                    # 本文档第 2 部分所有类型定义
├── stores/
│   ├── useNoteStore.ts             # 笔记状态管理
│   ├── useGroupStore.ts            # 分组状态管理
│   ├── useTagStore.ts              # 标签状态管理
│   ├── useSettingStore.ts          # 设置状态管理（localStorage 持久化）
│   └── useUIStore.ts              # UI 全局状态管理
├── components/
│   ├── layout/
│   │   ├── BrAppShell.tsx          # 全局壳组件
│   │   ├── BrAuthGuard.tsx         # 路由认证守卫
│   │   ├── BrWindowFrame.tsx       # 窗口骨架（标题栏+侧边栏+Outlet）
│   │   ├── BrMainLayout.tsx        # 主内容区（双栏布局）
│   │   ├── BrSidebar.tsx           # 侧边栏
│   │   ├── BrTitleBar.tsx          # 标题栏（拖拽区+窗口控制按钮）
│   │   └── BrNavigateHome.tsx      # 404 兜底重定向
│   └── ui/
│       ├── BrButton.tsx
│       ├── BrCard.tsx
│       ├── BrContextMenu.tsx
│       ├── BrInput.tsx
│       ├── BrModal.tsx
│       ├── BrToast.tsx
│       └── BrToggle.tsx
├── features/
│   ├── editor/
│   │   ├── BrEditor.tsx
│   │   ├── BrEditorToolbar.tsx
│   │   └── BrNoteList.tsx
│   ├── search/
│   │   ├── BrSearchPage.tsx
│   │   ├── BrSearchBar.tsx
│   │   └── BrSearchResult.tsx
│   ├── trash/
│   │   └── BrTrashView.tsx
│   ├── settings/
│   │   └── BrSettingsPage.tsx
│   ├── security/
│   │   └── BrLockScreen.tsx
│   ├── floating/
│   │   └── BrFloatingNote.tsx
│   └── templates/
│       └── BrTemplateSelector.tsx
├── hooks/
│   ├── useAutoSave.ts
│   ├── useContextMenu.ts
│   ├── useDebounce.ts
│   ├── useKeyboard.ts
│   └── useTheme.ts
├── utils/
│   ├── clipboard.ts
│   ├── format.ts
│   └── search.ts                   # Fuse.js 搜索引擎封装
├── styles/
│   └── global.css                  # UnoCSS 导入 + 基础重置
├── App.tsx                         # 路由配置入口
├── main.tsx                        # React 挂载入口
└── vite-env.d.ts                   # Vite 类型声明
```
