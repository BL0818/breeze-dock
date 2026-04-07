# BreezeNote 完整项目架构

> 技术栈：Tauri v2 + React 18 + TypeScript + Tailwind CSS v4 + shadcn/ui + Zustand + SQLite + Rust
> 应用定位：Linear 极简风格桌面笔记工具，轻量、私有、本地优先
> UI 规范：Linear 极简高级 UI + Notion 舒适排版 + SoybeanUI 官方配色
> 组件命名：基于 shadcn/ui 组件体系，React 组件以 `Br` 前缀命名
> 文档版本：1.1 | 最后更新：2026-03-31

---

## 1. 完整目录结构

```
BreezeDock/
├── index.html                          # Vite 入口 HTML，挂载 React 根节点
├── package.json                        # 前端依赖与脚本配置
├── ARCHITECTURE.md                     # 本文件：完整项目架构规范
├── tsconfig.json                       # TypeScript 主配置（引用 tsconfig.node）
├── tsconfig.node.json                  # Node 环境 TS 配置（Vite 构建用）
├── vite.config.ts                      # Vite 构建配置，集成 React 与 Tailwind CSS v4 插件
├── tailwind.config.ts                  # Tailwind CSS v4 配置（SoybeanUI 主题色）
│
├── src/                                # ===== 前端源码 =====
│   ├── main.tsx                        # React 应用入口，初始化 Router 和全局 Provider
│   ├── App.tsx                         # 根组件，配置路由表（锁屏 / 主界面）
│   ├── vite-env.d.ts                   # Vite 环境类型声明
│   │
│   ├── types/                          # TypeScript 类型定义
│   │   └── index.ts                    # 全局类型定义（Note、Group、Tag、Setting 等）
│   │
│   ├── styles/                         # 全局样式
│   │   └── global.css                  # Tailwind CSS 导入 + 拖拽区域 + 自定义滚动条样式
│   │
│   ├── stores/                         # Zustand 全局状态管理
│   │   ├── useNoteStore.ts             # 笔记状态：列表、当前选中、CRUD、历史
│   │   ├── useGroupStore.ts            # 分组状态：树形结构、展开/折叠
│   │   ├── useTagStore.ts              # 标签状态：创建、关联、筛选
│   │   ├── useSettingStore.ts          # 设置状态：主题、语言、密码（localStorage 持久化）
│   │   └── useUIStore.ts              # UI 状态：侧边栏、搜索、锁屏、弹窗、Toast
│   │
│   ├── components/                     # 通用组件
│   │   ├── ui/                         # 原子 UI 组件（Br 前缀）
│   │   │   ├── BrButton.tsx            # 通用按钮（primary / ghost / danger 变体）
│   │   │   ├── BrCard.tsx              # 卡片容器（Linear 极简扁平风格）
│   │   │   ├── BrContextMenu.tsx       # 右键上下文菜单
│   │   │   ├── BrInput.tsx             # 输入框（前缀图标 + 清除按钮）
│   │   │   ├── BrModal.tsx             # 模态弹窗（居中对话框）
│   │   │   ├── BrToast.tsx             # Toast 提示消息
│   │   │   └── BrToggle.tsx            # 切换开关
│   │   │
│   │   └── layout/                     # 布局组件
│   │       ├── BrAppShell.tsx          # 全局壳：主题注入、CSS 初始化
│   │       ├── BrAuthGuard.tsx         # 路由认证守卫（Outlet 包装）
│   │       ├── BrWindowFrame.tsx       # 窗口主框架（标题栏 + 侧边栏 + Outlet）
│   │       ├── BrMainLayout.tsx        # 主内容区（笔记列表 + 编辑器双栏）
│   │       ├── BrSidebar.tsx           # 侧边栏（分组列表 + 导航入口）
│   │       ├── BrTitleBar.tsx          # 自定义标题栏（拖拽区 + 窗口控制按钮）
│   │       └── BrNavigateHome.tsx      # 404 兜底重定向
│   │
│   ├── features/                       # 业务功能模块（按领域划分）
│   │   ├── editor/                     # 笔记编辑器
│   │   │   ├── BrEditor.tsx            # 富文本编辑器主组件
│   │   │   ├── BrEditorToolbar.tsx     # 编辑器工具栏（加粗、标题、列表）
│   │   │   └── BrNoteList.tsx          # 左侧笔记列表
│   │   ├── search/                     # 全局搜索
│   │   │   ├── BrSearchPage.tsx        # 搜索页面
│   │   │   ├── BrSearchBar.tsx         # 搜索输入栏
│   │   │   └── BrSearchResult.tsx      # 搜索结果列表
│   │   ├── trash/                      # 回收站
│   │   │   └── BrTrashView.tsx         # 回收站视图（恢复 + 永久删除）
│   │   ├── settings/                   # 设置
│   │   │   └── BrSettingsPage.tsx      # 设置页面
│   │   ├── security/                   # 安全加密
│   │   │   └── BrLockScreen.tsx        # 锁屏界面（密码验证入口）
│   │   ├── floating/                   # 悬浮笔记窗
│   │   │   └── BrFloatingNote.tsx      # 悬浮笔记组件（独立窗口内渲染）
│   │   └── templates/                  # 笔记模板
│   │       └── BrTemplateSelector.tsx  # 模板选择器
│   │
│   ├── hooks/                          # 自定义 React Hooks
│   │   ├── useAutoSave.ts             # 自动保存（监听编辑器内容变化）
│   │   ├── useContextMenu.ts          # 右键菜单（显示/隐藏/定位）
│   │   ├── useDebounce.ts             # 防抖（搜索输入等场景）
│   │   ├── useKeyboard.ts             # 快捷键（全局键盘事件）
│   │   └── useTheme.ts                # 主题切换（亮色/暗色）
│   │
│   └── utils/                          # 工具函数
│       ├── index.ts                    # 统一导出入口
│       ├── clipboard.ts               # 剪贴板操作
│       ├── format.ts                  # 格式化（日期、字数统计）
│       └── search.ts                  # Fuse.js 模糊搜索封装
│
├── src-tauri/                          # ===== Rust 后端源码 =====
│   ├── Cargo.toml                      # Rust 依赖声明
│   ├── build.rs                        # Tauri 构建脚本
│   ├── tauri.conf.json                 # Tauri v2 应用配置
│   ├── capabilities/
│   │   └── default.json                # 主窗口权限声明
│   ├── icons/                          # 应用图标（多尺寸 PNG、ICO、ICNS）
│   └── src/
│       ├── main.rs                     # 应用入口 → lib::run()
│       ├── lib.rs                      # 库入口：初始化 DB、注册命令/插件
│       ├── db/                         # 数据库层
│       │   ├── mod.rs                  # DbState + r2d2 连接池 + get_db_path
│       │   ├── schema.rs              # DDL 建表语句 + 索引初始化
│       │   ├── notes.rs               # 笔记表 CRUD + 数据模型
│       │   └── crypto.rs              # AES-256-GCM 加密/解密
│       ├── commands/                   # Tauri 命令层（前端可调用接口）
│       │   ├── mod.rs                  # CommandResult<T> + SuccessResponse
│       │   ├── notes.rs               # 笔记命令（CRUD、置顶、收藏、归档）
│       │   ├── groups.rs              # 分组命令（创建、更新、删除、排序）
│       │   ├── settings.rs            # 设置命令（读取、保存、批量获取）
│       │   ├── window.rs              # 窗口命令（悬浮窗创建/关闭/配置）
│       │   └── backup.rs              # 备份命令（导入/导出）
│       ├── window/
│       │   ├── mod.rs                  # 模块导出
│       │   └── floating.rs            # 悬浮窗创建/关闭/配置/鼠标穿透
│       ├── fs/
│       │   ├── mod.rs                  # 模块导出
│       │   └── backup.rs              # 备份文件读写 + JSON 序列化
│       └── tray/                       # 系统托盘（待实现）
│           └── mod.rs
│
└── docs/                               # 项目文档
    ├── backend-architecture.md         # 后端架构详细文档
    └── frontend-architecture.md        # 前端架构详细文档
```

---

## 2. SQLite 表设计

### 2.1 notes -- 笔记主表

```sql
CREATE TABLE IF NOT EXISTS notes (
    id          TEXT    PRIMARY KEY,              -- UUID v4
    title       TEXT    NOT NULL DEFAULT '',
    content     TEXT    NOT NULL DEFAULT '',      -- 支持 HTML/Markdown
    group_id    TEXT,                             -- 所属分组，NULL = 未分组
    template    TEXT    NOT NULL DEFAULT 'blank', -- blank / todo / diary / meeting
    is_pinned   INTEGER NOT NULL DEFAULT 0,
    is_starred  INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    is_trashed  INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,       -- 值越小越靠前
    word_count  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL,                 -- ISO 8601
    updated_at  TEXT    NOT NULL,
    trashed_at  TEXT,                             -- 移入回收站时间
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);
```

### 2.2 note_tags -- 笔记-标签关联表

```sql
CREATE TABLE IF NOT EXISTS note_tags (
    id          TEXT    PRIMARY KEY,              -- UUID v4
    note_id     TEXT    NOT NULL,
    tag_id      TEXT    NOT NULL,
    created_at  TEXT    NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)  REFERENCES tags(id)   ON DELETE CASCADE,
    UNIQUE(note_id, tag_id)
);
```

### 2.3 tags -- 标签表

```sql
CREATE TABLE IF NOT EXISTS tags (
    id          TEXT    PRIMARY KEY,              -- UUID v4
    name        TEXT    NOT NULL UNIQUE,
    color       TEXT    NOT NULL DEFAULT '#165DFF', -- SoybeanUI 主色
    created_at  TEXT    NOT NULL
);
```

### 2.4 groups -- 分组/文件夹表

```sql
CREATE TABLE IF NOT EXISTS groups (
    id          TEXT    PRIMARY KEY,              -- UUID v4
    name        TEXT    NOT NULL,
    parent_id   TEXT,                             -- NULL = 顶级分组（支持多级嵌套）
    icon        TEXT    NOT NULL DEFAULT 'folder',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES groups(id) ON DELETE SET NULL
);
```

### 2.5 note_history -- 笔记历史版本表

```sql
CREATE TABLE IF NOT EXISTS note_history (
    id          TEXT    PRIMARY KEY,              -- UUID v4
    note_id     TEXT    NOT NULL,
    title       TEXT    NOT NULL,                 -- 标题快照
    content     TEXT    NOT NULL,                 -- 正文快照
    created_at  TEXT    NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
```

### 2.6 settings -- 应用设置表

```sql
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT    PRIMARY KEY,              -- theme / language / enablePassword ...
    value       TEXT    NOT NULL                  -- JSON 字符串或简单值
);
```

### 2.7 floating_configs -- 悬浮窗配置表

```sql
CREATE TABLE IF NOT EXISTS floating_configs (
    id              TEXT    PRIMARY KEY,          -- UUID v4
    note_id         TEXT    NOT NULL,
    label           TEXT    NOT NULL UNIQUE,      -- Tauri 窗口唯一标识
    x               REAL    NOT NULL DEFAULT 100,
    y               REAL    NOT NULL DEFAULT 100,
    width           REAL    NOT NULL DEFAULT 320,
    height          REAL    NOT NULL DEFAULT 400,
    opacity         REAL    NOT NULL DEFAULT 1.0, -- 0.0~1.0
    is_penetrable   INTEGER NOT NULL DEFAULT 0,   -- 鼠标穿透
    is_collapsed    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
```

### 2.8 索引定义

```sql
-- 笔记表索引
CREATE INDEX IF NOT EXISTS idx_notes_group_id    ON notes(group_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_trashed  ON notes(is_trashed);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned   ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_is_starred  ON notes(is_starred);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at  ON notes(updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_template    ON notes(template);

-- 笔记-标签关联表索引
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id  ON note_tags(tag_id);

-- 标签表索引
CREATE INDEX IF NOT EXISTS idx_tags_name         ON tags(name);

-- 分组表索引
CREATE INDEX IF NOT EXISTS idx_groups_parent_id  ON groups(parent_id);

-- 历史版本表索引
CREATE INDEX IF NOT EXISTS idx_note_history_note_id ON note_history(note_id);

-- 悬浮窗配置表索引
CREATE INDEX IF NOT EXISTS idx_floating_configs_note_id ON floating_configs(note_id);
```

### 2.9 PRAGMA 配置

```sql
PRAGMA journal_mode   = WAL;      -- Write-Ahead Logging
PRAGMA foreign_keys   = ON;       -- 启用外键约束
PRAGMA busy_timeout   = 5000;     -- 锁定等待 5s
PRAGMA cache_size     = -2000;    -- 页面缓存 2MB
PRAGMA synchronous    = NORMAL;   -- WAL 模式推荐级别
```

---

## 3. tauri.conf.json 窗口配置

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/schema.json",
  "productName": "BreezeNote",
  "version": "0.1.0",
  "identifier": "com.breezenote.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "BreezeNote",
        "width": 1080,
        "height": 720,
        "minWidth": 800,
        "minHeight": 600,
        "decorations": false,
        "resizable": true,
        "center": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: https://asset.localhost; font-src 'self' data:; connect-src ipc: http://ipc.localhost"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "languages": ["SimpChinese", "English"],
        "displayLanguageSelector": true
      }
    }
  }
}
```

### 悬浮窗创建（运行时动态）

```rust
WebviewWindowBuilder::new(app, &label, WebviewUrl::App("floating".into()))
    .inner_size(320.0, 400.0)
    .title("BreezeNote Floating")
    .decorations(false)
    .transparent(false)
    .resizable(true)
    .skip_taskbar(true)
    .always_on_top(true)
    .position(x, y)
```

### capabilities/default.json

```jsonc
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "主窗口默认权限",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-create",
    "core:window:allow-close",
    "core:window:allow-set-size",
    "core:window:allow-set-position",
    "core:window:allow-set-always-on-top",
    "core:window:allow-set-focus",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-set-ignore-cursor-events",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-start-dragging",
    "core:window:allow-set-title",
    "core:window:allow-set-decorations",
    "core:window:allow-set-skip-taskbar",
    "core:window:allow-set-resizable",
    "core:window:allow-inner-size",
    "core:window:allow-outer-size",
    "core:window:allow-position",
    "core:window:allow-is-visible",
    "shell:allow-open"
  ]
}
```

---

## 4. React 路由规划

### 路由总览

| 路径 | 页面组件 | 认证 | 布局 | 嵌套 |
|------|---------|------|------|------|
| `/` | `BrMainLayout` | 是 | 侧边栏 | `BrNoteList` + `BrEditor` |
| `/search` | `BrSearchPage` | 是 | 全屏覆盖层 | 无 |
| `/trash` | `BrTrashPage` | 是 | 侧边栏 | 无 |
| `/settings` | `BrSettingsPage` | 是 | 侧边栏 | 无 |
| `/lock` | `BrLockScreen` | 否 | 全屏独立 | 无 |

### 路由层级结构

```tsx
<BrowserRouter>
  <BrAppShell>
    <Routes>
      {/* 锁屏路由 - 优先匹配 */}
      <Route path="/lock" element={<BrLockScreen />} />

      {/* 受保护路由 */}
      <Route element={<BrAuthGuard />}>
        <Route element={<BrWindowFrame />}>
          <Route path="/" element={<BrMainLayout />}>
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

### 路由守卫逻辑

```
BrAuthGuard:
  1. useSettingStore.enablePassword === false → 放行
  2. enablePassword === true && lockScreenVisible === true → 重定向 /lock
  3. enablePassword === true && lockScreenVisible === false → 放行
```

---

## 5. 全局 TypeScript 类型定义

> 文件：`src/types/index.ts`

### 基础类型

```typescript
type NoteId = string;                                    // UUID v4
type GroupId = string;                                   // UUID v4
type TagId = string;                                     // UUID v4
type NoteTemplate = 'blank' | 'todo' | 'note' | 'snippet' | 'idea';
type ThemeMode = 'light' | 'dark' | 'system';
type ViewType = 'all' | 'starred' | 'archived' | 'trash' | 'group';
type SortBy = 'updatedAt' | 'createdAt' | 'title' | 'sortOrder';
type SortOrder = 'asc' | 'desc';
type Language = 'zh-CN' | 'en-US';
```

### 数据模型

```typescript
interface Note {
  id: NoteId;
  title: string;
  content: string;                    // Markdown / JSON
  groupId: GroupId | null;
  tags: TagId[];
  template: NoteTemplate;
  isPinned: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  sortOrder: number;
  wordCount: number;
  createdAt: string;                  // ISO 8601
  updatedAt: string;
  trashedAt: string | null;
}

interface NoteHistory {
  id: string;
  noteId: NoteId;
  title: string;                      // 标题快照
  content: string;                    // 正文快照
  createdAt: string;
}

interface Tag {
  id: TagId;
  name: string;
  color: string;                      // 十六进制
  noteCount: number;                  // 计算字段
  createdAt: string;
}

interface Group {
  id: GroupId;
  name: string;
  parentId: GroupId | null;           // null = 根级
  icon: string;
  sortOrder: number;
  children?: Group[];                 // 树形嵌套
  createdAt: string;
}

interface FloatingConfig {
  noteId: NoteId;
  x: number; y: number;
  width: number; height: number;
  opacity: number;                    // 0~1
  isPenetrable: boolean;
  isCollapsed: boolean;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ContextMenuItem {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
  icon?: string;
  children?: ContextMenuItem[];
}
```

### API 交互类型

```typescript
interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

interface NoteFilter {
  view: ViewType;
  groupId?: GroupId | null;
  tagId?: TagId | null;
  query?: string;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  pinnedOnly?: boolean;
}

interface SearchResult {
  note: Note;
  score: number;                      // Fuse.js 匹配度
  highlights: SearchHighlight[];
}

interface SearchHighlight {
  field: 'title' | 'content';
  text: string;
  indices: [number, number][];
}
```

### 设置类型

```typescript
interface AppSettings {
  theme: ThemeMode;
  fontSize: number;                   // 12~24px
  autoSaveDelay: number;              // 200~3000ms
  language: Language;
  enablePassword: boolean;
  startupOnBoot: boolean;
  window: WindowSettings;
  editor: EditorSettings;
}

interface WindowSettings {
  width: number; height: number;
  x: number; y: number;
  isMaximized: boolean;
  sidebarWidth: number;
  sidebarVisible: boolean;
}

interface EditorSettings {
  showLineNumbers: boolean;
  spellCheck: boolean;
  tabSize: number;
  autoClosingBrackets: boolean;
  wordWrap: boolean;
}
```

### UI 状态类型

```typescript
interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
  createdAt: number;
}

interface ModalConfig {
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

interface ContextMenuState {
  visible: boolean;
  x: number; y: number;
  items: ContextMenuItem[];
  targetId?: string;
}
```

### 默认值常量

```typescript
const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  fontSize: 14,
  autoSaveDelay: 500,
  language: 'zh-CN',
  enablePassword: false,
  startupOnBoot: false,
  window: { width: 1080, height: 720, x: 100, y: 100, isMaximized: false, sidebarWidth: 280, sidebarVisible: true },
  editor: { showLineNumbers: false, spellCheck: false, tabSize: 2, autoClosingBrackets: true, wordWrap: true },
};
```

---

## 6. Rust 命令清单

### 统一类型约定

| 类型 | 定义 | 说明 |
|------|------|------|
| `CommandResult<T>` | `Result<T, String>` | 所有命令统一返回，错误以中文可读字符串传递 |
| `SuccessResponse` | `{ success: bool, message: Option<String> }` | 无需返回数据的操作响应 |

### 6.1 notes -- 笔记命令（16 个）

| 命令 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `create_note` | `title?, content?, group_id?, template?` | `CommandResult<Note>` | 创建新笔记 |
| `get_note` | `id: String` | `CommandResult<Option<Note>>` | 获取单个笔记 |
| `update_note` | `id, title?, content?, group_id?, template?` | `CommandResult<Note>` | 更新笔记，自动保存历史版本 |
| `delete_note` | `id: String` | `CommandResult<SuccessResponse>` | 永久删除 |
| `trash_note` | `id: String` | `CommandResult<SuccessResponse>` | 移至回收站 |
| `restore_note` | `id: String` | `CommandResult<SuccessResponse>` | 从回收站恢复 |
| `get_notes` | `group_id?, is_pinned?, is_starred?, is_archived?, is_trashed?, keyword?, limit?, offset?` | `CommandResult<Vec<Note>>` | 多条件过滤查询 |
| `search_notes` | `keyword: String, limit?` | `CommandResult<Vec<Note>>` | 全文搜索 |
| `pin_note` | `id, pinned: bool` | `CommandResult<SuccessResponse>` | 置顶切换 |
| `star_note` | `id, starred: bool` | `CommandResult<SuccessResponse>` | 收藏切换 |
| `archive_note` | `id, archived: bool` | `CommandResult<SuccessResponse>` | 归档切换 |
| `reorder_notes` | `orders: Vec<(String, i32)>` | `CommandResult<SuccessResponse>` | 批量排序 |
| `get_note_history` | `note_id: String` | `CommandResult<Vec<NoteHistory>>` | 历史版本列表 |
| `rollback_note` | `note_id, history_id` | `CommandResult<Note>` | 回滚到指定版本 |
| `empty_trash` | — | `CommandResult<SuccessResponse>` | 清空回收站 |
| `get_trash_notes` | — | `CommandResult<Vec<Note>>` | 回收站列表 |

### 6.2 tags -- 标签命令（7 个）

| 命令 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `create_tag` | `name, color?` | `CommandResult<Tag>` | 创建标签（名称唯一） |
| `get_tags` | — | `CommandResult<Vec<Tag>>` | 全部标签 |
| `update_tag` | `id, name?, color?` | `CommandResult<Tag>` | 更新标签 |
| `delete_tag` | `id` | `CommandResult<SuccessResponse>` | 删除标签（级联清除关联） |
| `add_note_tag` | `note_id, tag_id` | `CommandResult<SuccessResponse>` | 添加标签关联 |
| `remove_note_tag` | `note_id, tag_id` | `CommandResult<SuccessResponse>` | 移除标签关联 |
| `get_notes_by_tag` | `tag_id` | `CommandResult<Vec<Note>>` | 按标签查笔记 |

### 6.3 groups -- 分组命令（5 个）

| 命令 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `create_group` | `name, parent_id?, icon?` | `CommandResult<Group>` | 创建分组（支持多级嵌套） |
| `get_groups` | — | `CommandResult<Vec<Group>>` | 全部分组（按 sort_order） |
| `update_group` | `id, name, parent_id?` | `CommandResult<Group>` | 更新分组 |
| `delete_group` | `id` | `CommandResult<SuccessResponse>` | 删除分组（笔记 groupId 置 null） |
| `reorder_groups` | `orders: Vec<(String, i32)>` | `CommandResult<SuccessResponse>` | 批量排序 |

### 6.4 settings -- 设置命令（3 个）

| 命令 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `get_setting` | `key: String` | `CommandResult<Option<String>>` | 获取单个设置 |
| `set_setting` | `key, value` | `CommandResult<()>` | INSERT OR REPLACE |
| `get_all_settings` | — | `CommandResult<Vec<SettingItem>>` | 全部设置 |

### 6.5 window -- 窗口命令（5 个）

| 命令 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `create_floating` | `label, title?, width, height, x?, y?, always_on_top?, transparent?, opacity?, skip_taskbar?, resizable?, decorations?` | `CommandResult<SuccessResponse>` | 创建悬浮窗 |
| `close_floating` | `label` | `CommandResult<SuccessResponse>` | 关闭悬浮窗 |
| `update_floating_config` | 同 create_floating | `CommandResult<SuccessResponse>` | 更新悬浮窗配置 |
| `toggle_penetration` | `label, enabled` | `CommandResult<SuccessResponse>` | 鼠标穿透切换 |
| `list_floatings` | — | `CommandResult<Vec<FloatingConfig>>` | 悬浮窗列表 |

### 6.6 backup -- 备份命令（4 个）

| 命令 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `export_data` | — | `CommandResult<String>` | 导出 JSON 字符串 |
| `export_to_file` | `path` | `CommandResult<String>` | 导出到文件 |
| `import_data` | `json, overwrite?` | `CommandResult<ImportResult>` | 从 JSON 导入 |
| `import_from_file` | `path, overwrite?` | `CommandResult<ImportResult>` | 从文件导入 |

---

## 7. Zustand 状态管理规划

### 7.1 useNoteStore（16 个 Actions）

**文件**: `src/stores/useNoteStore.ts`

| 方法 | 参数 | 描述 |
|------|------|------|
| `loadNotes` | `filter?: NoteFilter` | 从 Tauri 后端加载笔记 |
| `createNote` | `template?, groupId?` | 新建并选中 |
| `updateNote` | `id, updates: Partial<Note>` | 更新字段 |
| `deleteNote` | `id` | 永久删除 |
| `trashNote` | `id` | 移入回收站 |
| `restoreNote` | `id` | 恢复 |
| `pinNote` | `id` | 置顶切换 |
| `starNote` | `id` | 星标切换 |
| `archiveNote` | `id` | 归档切换 |
| `reorderNotes` | `from, to` | 拖拽排序 |
| `searchNotes` | `query` | Fuse.js 模糊搜索 |
| `loadHistory` | `noteId` | 加载历史版本 |
| `rollbackNote` | `noteId, historyId` | 回滚版本 |
| `emptyTrash` | — | 清空回收站 |
| `setFilter` | `Partial<NoteFilter>` | 更新过滤条件 |
| `selectNote` | `id \| null` | 选中笔记 |

### 7.2 useGroupStore（7 个 Actions）

**文件**: `src/stores/useGroupStore.ts`

| 方法 | 参数 | 描述 |
|------|------|------|
| `loadGroups` | — | 加载全部分组 |
| `createGroup` | `name, parentId?, icon?` | 新建分组 |
| `updateGroup` | `id, updates` | 更新属性 |
| `deleteGroup` | `id` | 删除分组 |
| `reorderGroups` | `from, to` | 拖拽排序 |
| `toggleExpand` | `id` | 展开/折叠 |
| `getGroupTree` | — | 扁平→树形转换 |

### 7.3 useTagStore（7 个 Actions）

**文件**: `src/stores/useTagStore.ts`

| 方法 | 参数 | 描述 |
|------|------|------|
| `loadTags` | — | 加载全部标签 |
| `createTag` | `name, color` | 新建标签 |
| `updateTag` | `id, updates` | 更新属性 |
| `deleteTag` | `id` | 删除标签 |
| `addNoteTag` | `noteId, tagId` | 添加关联 |
| `removeNoteTag` | `noteId, tagId` | 移除关联 |
| `selectTag` | `id \| null` | 选中标签筛选 |

### 7.4 useSettingStore（12 个 Actions）

**文件**: `src/stores/useSettingStore.ts`
**持久化**: localStorage，key = `breezenote-settings`

| 方法 | 参数 | 描述 |
|------|------|------|
| `loadSettings` | — | 读取 + 合并默认值 |
| `updateSetting` | `Partial<AppSettings>` | 部分更新 |
| `resetSettings` | — | 重置为默认 |
| `toggleTheme` | — | light/dark/system 循环 |
| `setTheme` | `ThemeMode` | 直接设置主题 |
| `setFontSize` | `number` | 12~24px |
| `setAutoSaveDelay` | `number` | 200~3000ms |
| `setLanguage` | `Language` | 设置语言 |
| `togglePassword` | — | 密码保护开关 |
| `toggleStartupOnBoot` | — | 开机自启开关 |
| `updateWindowSettings` | `Partial<WindowSettings>` | 更新窗口设置 |
| `updateEditorSettings` | `Partial<EditorSettings>` | 更新编辑器设置 |

### 7.5 useUIStore（20 个 Actions）

**文件**: `src/stores/useUIStore.ts`

| 方法 | 参数 | 描述 |
|------|------|------|
| `toggleSidebar` | — | 侧边栏切换 |
| `setSidebarOpen` | `boolean` | 设置侧边栏状态 |
| `openSearch` | — | 打开搜索 |
| `closeSearch` | — | 关闭搜索 |
| `setSearchQuery` | `string` | 更新搜索词 |
| `setCurrentView` | `ViewType` | 切换视图 |
| `addFloating` | `FloatingConfig` | 添加悬浮窗 |
| `removeFloating` | `noteId` | 移除悬浮窗 |
| `updateFloating` | `noteId, updates` | 更新悬浮窗配置 |
| `toggleFloatingCollapse` | `noteId` | 折叠切换 |
| `toggleFloatingPenetrable` | `noteId` | 鼠标穿透切换 |
| `showLockScreen` | — | 显示锁屏 |
| `hideLockScreen` | — | 隐藏锁屏 |
| `showToast` | `type, message, duration?` | 显示 Toast → 返回 ID |
| `dismissToast` | `id` | 关闭 Toast |
| `openContextMenu` | `x, y, items, targetId?` | 打开右键菜单 |
| `closeContextMenu` | — | 关闭右键菜单 |
| `openModal` | `config` | 打开弹窗 → 返回 ID |
| `closeModal` | `id` | 关闭弹窗 |
| `clearAllModals` | — | 关闭所有弹窗 |

### Store 依赖与初始化顺序

```
useSettingStore (独立)
     ↓
useUIStore (依赖 settings 判断认证)
     ↓
useGroupStore (独立)  →  useTagStore (独立)
     ↓
useNoteStore (依赖 UI 状态 + groupId 过滤)
```

初始化顺序：`SettingStore → UIStore → GroupStore → TagStore → NoteStore`

---

## 8. package.json 依赖清单

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
    "@vitejs/plugin-react": "^4.2.1",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.3.3",
    "vite": "^4.5.1"
  }
}
```

### 依赖用途速查

| 包名 | 用途 |
|------|------|
| `react` / `react-dom` | UI 框架核心 |
| `react-router-dom` | 客户端路由（嵌套路由 + 守卫） |
| `zustand` | 轻量状态管理 |
| `fuse.js` | 前端模糊搜索（支持拼音） |
| `@tauri-apps/api` | Tauri v2 前端 API（invoke、事件） |
| `@tauri-apps/plugin-shell` | Shell 插件（外部链接） |
| `uuid` | UUID v4 生成器 |
| `dayjs` | 轻量日期格式化 |
| `tailwindcss` | Tailwind CSS v4 原子化样式引擎 |
| `@tailwindcss/vite` | Tailwind CSS v4 Vite 插件 |
| `vite` | 构建工具 + HMR |
| `@vitejs/plugin-react` | Vite React Fast Refresh |
| `typescript` | 类型检查 |

---

## 架构约定

1. **分层原则**：前端 `invoke` → 命令层（参数校验/转换）→ 数据库层（SQL 操作），严格分离
2. **错误处理**：所有命令 `Result<T, String>`，错误信息中文可读，前端 `.catch` 统一处理
3. **连接池**：`r2d2` + `r2d2_sqlite` 管理，通过 Tauri `State` 注入
4. **数据安全**：AES-256-GCM 加密，密钥 `Mutex<Option<Vec<u8>>>` 仅解锁后驻留内存
5. **窗口管理**：主窗口关闭→隐藏至托盘；悬浮窗 `FloatingState` 管理生命周期
6. **命名规范**：React 组件 `Br` 前缀；Rust 模块按领域划分；数据库字段 `snake_case`
7. **透明度限制**：Tauri v2 尚未内置 `set_opacity`，需通过 Win32 `SetLayeredWindowAttributes` 原生实现
8. **UI 组件库**：全部使用 shadcn/ui 官方组件，禁止自定义原生 CSS
9. **样式引擎**：统一使用 Tailwind CSS v4 原子类，禁止手写 .css 文件
10. **配色规范**：严格遵循 SoybeanUI 官方配色，禁止使用 shadcn/ui 默认色
11. **交互规范**：所有动画 150-200ms ease-in-out，对标 Linear 极简克制风格
