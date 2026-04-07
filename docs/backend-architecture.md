# BreezeNote 后端架构规范

> 技术栈：Tauri v2 + React 18 + TypeScript + SQLite + Rust
> 应用定位：iOS 风格桌面笔记工具
> 文档版本：1.0 | 最后更新：2026-03-30

---

## 1. 完整目录结构

```
BreezeDock/
├── index.html                          # Vite 入口 HTML，挂载 React 根节点
├── package.json                        # 前端依赖与脚本配置
├── tsconfig.json                       # TypeScript 主配置（引用 tsconfig.node）
├── tsconfig.node.json                  # Node 环境 TS 配置（Vite 构建用）
├── vite.config.ts                      # Vite 构建配置，集成 React 与 UnoCSS 插件
├── uno.config.ts                       # UnoCSS 原子化样式配置
│
├── src/                                # ===== 前端源码 =====
│   ├── main.tsx                        # React 应用入口，初始化 Router 和全局 Provider
│   ├── App.tsx                         # 根组件，配置路由表（锁屏 / 主界面）
│   ├── vite-env.d.ts                   # Vite 环境类型声明
│   │
│   ├── components/                     # 通用组件
│   │   ├── ui/                         # 原子 UI 组件（Br 前缀）
│   │   │   ├── BrButton.tsx            # 通用按钮组件，支持 primary / ghost / danger 变体
│   │   │   ├── BrCard.tsx              # 卡片容器组件，圆角阴影 iOS 风格
│   │   │   ├── BrContextMenu.tsx       # 右键上下文菜单组件
│   │   │   ├── BrInput.tsx             # 输入框组件，支持前缀图标和清除按钮
│   │   │   ├── BrModal.tsx             # 模态弹窗组件，iOS 风格底部弹出
│   │   │   └── BrToggle.tsx            # 开关切换组件，iOS 滑动开关样式
│   │   │
│   │   └── layout/                     # 布局组件
│   │       ├── BrSidebar.tsx           # 侧边栏布局，包含分组列表和导航入口
│   │       ├── BrTitleBar.tsx          # 自定义标题栏，窗口拖拽区域和控制按钮
│   │       └── BrWindowFrame.tsx       # 窗口主框架，组合标题栏 + 侧边栏 + 内容区
│   │
│   ├── features/                       # 业务功能模块（按领域划分）
│   │   ├── editor/                     # 笔记编辑器模块
│   │   │   ├── BrEditor.tsx            # 富文本编辑器主组件
│   │   │   └── BrEditorToolbar.tsx     # 编辑器工具栏（加粗、标题、列表等）
│   │   ├── floating/                   # 悬浮笔记窗模块
│   │   │   └── BrFloatingNote.tsx      # 悬浮笔记组件，独立窗口内渲染
│   │   ├── search/                     # 搜索功能模块
│   │   │   ├── BrSearchBar.tsx         # 搜索输入栏组件
│   │   │   └── BrSearchResult.tsx      # 搜索结果列表组件
│   │   ├── security/                   # 安全加密模块
│   │   │   └── BrLockScreen.tsx        # 锁屏界面组件，密码验证入口
│   │   ├── templates/                  # 笔记模板模块
│   │   │   └── BrTemplateSelector.tsx  # 模板选择器组件，创建笔记时选择模板
│   │   └── trash/                      # 回收站模块
│   │       └── BrTrashView.tsx         # 回收站视图组件，恢复和永久删除
│   │
│   ├── stores/                         # Zustand 全局状态管理
│   │   ├── useNoteStore.ts             # 笔记状态：列表、当前选中、CRUD 操作
│   │   ├── useSettingStore.ts          # 设置状态：主题、语言、密码开关等
│   │   └── useUIStore.ts              # UI 状态：侧边栏展开、锁屏、弹窗状态
│   │
│   ├── hooks/                          # 自定义 React Hooks
│   │   ├── useAutoSave.ts             # 自动保存 Hook，监听编辑器内容变化定时保存
│   │   ├── useContextMenu.ts          # 右键菜单 Hook，管理菜单显示/隐藏和定位
│   │   ├── useDebounce.ts             # 防抖 Hook，搜索输入等场景
│   │   ├── useKeyboard.ts             # 快捷键 Hook，注册全局键盘事件
│   │   └── useTheme.ts                # 主题 Hook，切换亮色/暗色主题
│   │
│   ├── utils/                          # 工具函数
│   │   ├── index.ts                    # 工具函数统一导出入口
│   │   ├── clipboard.ts               # 剪贴板操作工具（复制、粘贴）
│   │   ├── format.ts                  # 格式化工具（日期格式化、字数统计）
│   │   └── search.ts                  # 搜索工具（Fuse.js 模糊搜索配置）
│   │
│   ├── types/                          # TypeScript 类型定义
│   │   └── index.ts                    # 全局类型定义（Note、Group、Setting 等接口）
│   │
│   └── styles/                         # 全局样式
│       └── global.css                  # 全局 CSS 变量、基础样式、主题色定义
│
├── src-tauri/                          # ===== Rust 后端源码 =====
│   ├── Cargo.toml                      # Rust 项目配置和依赖声明
│   ├── Cargo.lock                      # Rust 依赖锁定文件
│   ├── build.rs                        # Tauri 构建脚本，编译时生成资源配置
│   ├── tauri.conf.json                 # Tauri v2 应用配置（窗口、安全、打包）
│   │
│   ├── capabilities/                   # Tauri v2 权限声明目录
│   │   └── default.json                # 主窗口默认权限（窗口操作、Shell 等）
│   │
│   ├── icons/                          # 应用图标资源（多尺寸 PNG、ICO、ICNS）
│   │   ├── 32x32.png                   # 32x32 像素图标
│   │   ├── 128x128.png                 # 128x128 像素图标
│   │   ├── 128x128@2x.png              # 256x256 像素高清图标
│   │   ├── icon.icns                   # macOS 图标格式
│   │   └── icon.ico                    # Windows 图标格式
│   │
│   ├── gen/                            # Tauri 自动生成的构建产物
│   │   └── schemas/                    # JSON Schema 定义（capabilities 校验用）
│   │
│   ├── src/                            # Rust 源码
│   │   ├── main.rs                     # 应用入口，调用 lib::run()
│   │   ├── lib.rs                      # 应用库入口，初始化数据库、注册命令和插件
│   │   │
│   │   ├── db/                         # 数据库层
│   │   │   ├── mod.rs                  # 模块声明，导出 DbState 和 get_db_path
│   │   │   ├── schema.rs              # DDL 定义，建表语句和索引初始化
│   │   │   ├── notes.rs               # 笔记表 CRUD 操作和数据模型
│   │   │   └── crypto.rs              # AES-256-GCM 加密/解密模块
│   │   │
│   │   ├── commands/                   # Tauri 命令层（前端可调用接口）
│   │   │   ├── mod.rs                  # 模块声明，定义 CommandResult 和 SuccessResponse
│   │   │   ├── notes.rs               # 笔记相关命令（CRUD、置顶、收藏、归档等）
│   │   │   ├── groups.rs              # 分组相关命令（创建、更新、删除、排序）
│   │   │   ├── settings.rs            # 设置相关命令（读取、保存、批量获取）
│   │   │   ├── window.rs              # 窗口相关命令（悬浮窗创建、关闭、配置更新）
│   │   │   └── backup.rs              # 备份相关命令（导入、导出、文件读写）
│   │   │
│   │   ├── window/                     # 窗口管理逻辑
│   │   │   ├── mod.rs                  # 模块声明
│   │   │   └── floating.rs            # 悬浮窗创建/关闭/配置更新/鼠标穿透实现
│   │   │
│   │   ├── fs/                         # 文件系统操作
│   │   │   ├── mod.rs                  # 模块声明
│   │   │   └── backup.rs              # 备份文件读写，数据序列化/反序列化
│   │   │
│   │   └── tray/                       # 系统托盘（待实现）
│   │       └── mod.rs                  # 托盘图标和菜单配置
│   │
│   └── target/                         # Rust 编译输出目录（构建产物，不提交 Git）
│
└── docs/                               # 项目文档
    └── backend-architecture.md         # 本文件：后端架构规范
```

---

## 2. SQLite 表设计

### 2.1 notes -- 笔记主表

```sql
-- 笔记主表：存储所有笔记的核心数据
CREATE TABLE IF NOT EXISTS notes (
    id          TEXT    PRIMARY KEY,              -- 笔记唯一标识，UUID v4 格式
    title       TEXT    NOT NULL DEFAULT '',      -- 笔记标题，默认空字符串
    content     TEXT    NOT NULL DEFAULT '',      -- 笔记正文内容（支持富文本 HTML/Markdown）
    group_id    TEXT,                             -- 所属分组 ID，NULL 表示未分组
    template    TEXT    NOT NULL DEFAULT 'blank', -- 笔记模板类型：blank / todo / diary / meeting
    is_pinned   INTEGER NOT NULL DEFAULT 0,       -- 是否置顶（0=否，1=是）
    is_starred  INTEGER NOT NULL DEFAULT 0,       -- 是否收藏/标星（0=否，1=是）
    is_archived INTEGER NOT NULL DEFAULT 0,       -- 是否归档（0=否，1=是）
    is_trashed  INTEGER NOT NULL DEFAULT 0,       -- 是否在回收站（0=否，1=是）
    sort_order  INTEGER NOT NULL DEFAULT 0,       -- 手动排序序号，值越小越靠前
    word_count  INTEGER NOT NULL DEFAULT 0,       -- 正文字数统计
    created_at  TEXT    NOT NULL,                 -- 创建时间，ISO 8601 / RFC 3339 格式
    updated_at  TEXT    NOT NULL,                 -- 最后更新时间，ISO 8601 / RFC 3339 格式
    trashed_at  TEXT,                             -- 移入回收站时间，NULL 表示未删除
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);
```

### 2.2 note_tags -- 笔记-标签关联表

```sql
-- 笔记与标签的多对多关联表
CREATE TABLE IF NOT EXISTS note_tags (
    id          TEXT    PRIMARY KEY,              -- 关联记录唯一标识，UUID v4
    note_id     TEXT    NOT NULL,                 -- 笔记 ID
    tag_id      TEXT    NOT NULL,                 -- 标签 ID
    created_at  TEXT    NOT NULL,                 -- 关联创建时间
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)  REFERENCES tags(id)   ON DELETE CASCADE,
    UNIQUE(note_id, tag_id)                      -- 同一笔记不能重复关联同一标签
);
```

### 2.3 tags -- 标签表

```sql
-- 标签表：管理笔记标签
CREATE TABLE IF NOT EXISTS tags (
    id          TEXT    PRIMARY KEY,              -- 标签唯一标识，UUID v4 格式
    name        TEXT    NOT NULL UNIQUE,          -- 标签名称，全局唯一
    color       TEXT    NOT NULL DEFAULT '#007AFF', -- 标签颜色，十六进制色值，默认 iOS 蓝
    created_at  TEXT    NOT NULL                  -- 创建时间，ISO 8601 / RFC 3339 格式
);
```

### 2.4 groups -- 分组/文件夹表

```sql
-- 分组/文件夹表：支持多级嵌套的树形结构
CREATE TABLE IF NOT EXISTS groups (
    id          TEXT    PRIMARY KEY,              -- 分组唯一标识，UUID v4 格式
    name        TEXT    NOT NULL,                 -- 分组名称
    parent_id   TEXT,                             -- 父分组 ID，NULL 表示顶级分组
    icon        TEXT    NOT NULL DEFAULT 'folder', -- 分组图标标识（folder / briefcase / heart 等）
    sort_order  INTEGER NOT NULL DEFAULT 0,       -- 排序序号，值越小越靠前
    created_at  TEXT    NOT NULL,                 -- 创建时间，ISO 8601 / RFC 3339 格式
    FOREIGN KEY (parent_id) REFERENCES groups(id) ON DELETE SET NULL
);
```

### 2.5 note_history -- 笔记历史版本表

```sql
-- 笔记历史版本表：保存笔记的修改快照，用于版本回滚
CREATE TABLE IF NOT EXISTS note_history (
    id          TEXT    PRIMARY KEY,              -- 历史记录唯一标识，UUID v4 格式
    note_id     TEXT    NOT NULL,                 -- 所属笔记 ID
    title       TEXT    NOT NULL,                 -- 该版本的标题快照
    content     TEXT    NOT NULL,                 -- 该版本的正文快照
    created_at  TEXT    NOT NULL,                 -- 历史记录创建时间
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
```

### 2.6 settings -- 应用设置表

```sql
-- 应用设置表：键值对形式存储全局配置
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT    PRIMARY KEY,              -- 设置项键名（如 theme / language / enablePassword）
    value       TEXT    NOT NULL                  -- 设置项值（JSON 字符串或简单值）
);
```

### 2.7 floating_configs -- 悬浮窗配置表

```sql
-- 悬浮窗配置表：持久化每个悬浮笔记窗的位置和样式
CREATE TABLE IF NOT EXISTS floating_configs (
    id              TEXT    PRIMARY KEY,          -- 配置记录唯一标识，UUID v4 格式
    note_id         TEXT    NOT NULL,             -- 关联的笔记 ID
    label           TEXT    NOT NULL UNIQUE,      -- 窗口标签（Tauri 窗口唯一标识符）
    x               REAL    NOT NULL DEFAULT 100, -- 窗口 X 坐标（像素）
    y               REAL    NOT NULL DEFAULT 100, -- 窗口 Y 坐标（像素）
    width           REAL    NOT NULL DEFAULT 320, -- 窗口宽度（像素）
    height          REAL    NOT NULL DEFAULT 400, -- 窗口高度（像素）
    opacity         REAL    NOT NULL DEFAULT 1.0, -- 窗口透明度（0.0~1.0）
    is_penetrable   INTEGER NOT NULL DEFAULT 0,   -- 是否启用鼠标穿透（0=否，1=是）
    is_collapsed    INTEGER NOT NULL DEFAULT 0,   -- 是否折叠（0=否，1=是）
    created_at      TEXT    NOT NULL,             -- 创建时间
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
```

### 2.8 索引定义

```sql
-- ===== 性能优化索引 =====

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
-- 应用启动时执行的数据库配置
PRAGMA journal_mode   = WAL;      -- Write-Ahead Logging 模式，提升并发读性能
PRAGMA foreign_keys   = ON;       -- 启用外键约束
PRAGMA busy_timeout   = 5000;     -- 数据库锁定等待超时 5 秒
PRAGMA cache_size     = -2000;    -- 页面缓存 2MB
PRAGMA synchronous    = NORMAL;   -- WAL 模式下的推荐同步级别
```

---

## 3. tauri.conf.json 窗口配置

```jsonc
{
  // Tauri v2 配置 Schema
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/schema.json",

  // 应用基础信息
  "productName": "BreezeNote",
  "version": "0.1.0",
  "identifier": "com.breezenote.app",

  // 构建配置
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },

  // 应用配置
  "app": {
    // 窗口定义
    "windows": [
      {
        // 主窗口配置
        "label": "main",
        "title": "BreezeNote",
        "width": 1080,
        "height": 720,
        "minWidth": 800,
        "minHeight": 600,
        "decorations": false,
        "resizable": true,
        "center": true,
        "visible": true,
        "fullscreen": false
      }
    ],

    // 安全策略
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: https://asset.localhost; font-src 'self' data:; connect-src ipc: http://ipc.localhost"
    },

    // 文件系统访问范围
    "paths": {
      "all": true
    }
  },

  // 打包配置
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
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "",
      "wix": null,
      "nsis": {
        "languages": ["SimpChinese", "English"],
        "displayLanguageSelector": true
      }
    }
  },

  // 插件配置
  "plugins": {
    "shell": {
      "open": true
    }
  }
}
```

### 悬浮窗创建配置模板（运行时动态创建）

悬浮窗不在此配置文件中静态定义，而是通过 Rust 命令 `create_floating` 在运行时动态创建。创建参数模板如下：

```rust
// 悬浮窗创建时的默认配置参数
WebviewWindowBuilder::new(app, &label, WebviewUrl::App("floating".into()))
    .inner_size(320.0, 400.0)           // 默认尺寸：320x400
    .title("BreezeNote Floating")       // 窗口标题
    .decorations(false)                  // 无边框
    .transparent(false)                  // 非透明
    .resizable(true)                     // 可调整大小
    .skip_taskbar(true)                  // 不显示在任务栏
    .always_on_top(true)                 // 始终置顶
    .position(x, y)                      // 指定位置（可选）
```

### capabilities/default.json -- 权限声明

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

## 4. Rust 命令清单

### 统一类型约定

| 类型别名 | 定义 | 说明 |
|---------|------|------|
| `CommandResult<T>` | `Result<T, String>` | 所有命令统一返回类型，错误以字符串传递至前端 |
| `SuccessResponse` | `{ success: bool, message: Option<String> }` | 无需返回数据的操作统一响应 |
| `Note` | 笔记完整结构体 | 含 id, title, content, group_id, is_pinned, is_starred, is_archived, is_trashed, template, sort_order, word_count, created_at, updated_at, trashed_at |
| `NoteHistory` | 历史版本结构体 | 含 id, note_id, title, content, created_at |
| `Group` | 分组结构体 | 含 id, name, parent_id, icon, sort_order, created_at |
| `SettingItem` | 设置项结构体 | 含 key, value |
| `ImportResult` | 导入结果结构体 | 含 notes_imported, groups_imported, settings_imported, skipped |
| `FloatingConfig` | 悬浮窗配置结构体 | 含 label, title, width, height, x, y, always_on_top, transparent, opacity, skip_taskbar, resizable, decorations |

---

### 4.1 notes -- 笔记命令

| 命令 | 参数 | 返回类型 | 功能描述 |
|------|------|---------|---------|
| `create_note` | `title: Option<String>`, `content: Option<String>`, `group_id: Option<String>`, `template: Option<String>` | `CommandResult<Note>` | 创建新笔记，自动生成 UUID 和时间戳 |
| `get_note` | `id: String` | `CommandResult<Option<Note>>` | 根据 ID 获取单个笔记，不存在返回 null |
| `update_note` | `id: String`, `title: Option<String>`, `content: Option<String>`, `group_id: Option<String>`, `template: Option<String>` | `CommandResult<Note>` | 更新笔记，仅更新传入的字段，内容变化时自动保存历史版本 |
| `delete_note` | `id: String` | `CommandResult<SuccessResponse>` | 永久删除笔记及其关联的历史记录 |
| `trash_note` | `id: String` | `CommandResult<SuccessResponse>` | 将笔记移至回收站（软删除），记录 trashed_at 时间 |
| `restore_note` | `id: String` | `CommandResult<SuccessResponse>` | 从回收站恢复笔记，清除 trashed_at |
| `get_notes` | `group_id: Option<String>`, `is_pinned: Option<i32>`, `is_starred: Option<i32>`, `is_archived: Option<i32>`, `is_trashed: Option<i32>`, `keyword: Option<String>`, `limit: Option<i32>`, `offset: Option<i32>` | `CommandResult<Vec<Note>>` | 多条件过滤查询笔记列表，支持分页和关键字搜索 |
| `search_notes` | `keyword: String`, `limit: Option<i32>` | `CommandResult<Vec<Note>>` | 全文搜索笔记（标题和内容模糊匹配），默认限制 50 条 |
| `pin_note` | `id: String`, `pinned: bool` | `CommandResult<SuccessResponse>` | 切换笔记置顶状态 |
| `star_note` | `id: String`, `starred: bool` | `CommandResult<SuccessResponse>` | 切换笔记收藏状态 |
| `archive_note` | `id: String`, `archived: bool` | `CommandResult<SuccessResponse>` | 切换笔记归档状态 |
| `reorder_notes` | `orders: Vec<(String, i32)>` | `CommandResult<SuccessResponse>` | 批量更新笔记排序，参数为 [noteId, sortOrder] 数组 |
| `get_note_history` | `note_id: String` | `CommandResult<Vec<NoteHistory>>` | 获取指定笔记的历史版本列表，按创建时间降序 |
| `rollback_note` | `note_id: String`, `history_id: String` | `CommandResult<Note>` | 回滚笔记到指定历史版本，自动保存当前内容为新历史 |
| `empty_trash` | （无参数） | `CommandResult<SuccessResponse>` | 清空回收站，永久删除所有已标记 trashed 的笔记 |
| `get_trash_notes` | （无参数） | `CommandResult<Vec<Note>>` | 获取回收站内所有笔记列表 |

### 4.2 tags -- 标签命令

| 命令 | 参数 | 返回类型 | 功能描述 |
|------|------|---------|---------|
| `create_tag` | `name: String`, `color: Option<String>` | `CommandResult<Tag>` | 创建新标签，名称全局唯一，颜色默认 #007AFF |
| `get_tags` | （无参数） | `CommandResult<Vec<Tag>>` | 获取所有标签列表 |
| `update_tag` | `id: String`, `name: Option<String>`, `color: Option<String>` | `CommandResult<Tag>` | 更新标签属性 |
| `delete_tag` | `id: String` | `CommandResult<SuccessResponse>` | 删除标签，级联清除所有笔记与该标签的关联 |
| `add_note_tag` | `note_id: String`, `tag_id: String` | `CommandResult<SuccessResponse>` | 为笔记添加标签关联 |
| `remove_note_tag` | `note_id: String`, `tag_id: String` | `CommandResult<SuccessResponse>` | 移除笔记的标签关联 |
| `get_notes_by_tag` | `tag_id: String` | `CommandResult<Vec<Note>>` | 获取指定标签下的所有笔记 |

### 4.3 groups -- 分组命令

| 命令 | 参数 | 返回类型 | 功能描述 |
|------|------|---------|---------|
| `create_group` | `name: String`, `parent_id: Option<String>`, `icon: Option<String>` | `CommandResult<Group>` | 创建新分组，支持指定父分组实现多级嵌套，自动计算排序序号 |
| `get_groups` | （无参数） | `CommandResult<Vec<Group>>` | 获取所有分组，按 sort_order 升序排列 |
| `update_group` | `id: String`, `name: String`, `parent_id: Option<String>` | `CommandResult<Group>` | 更新分组名称和父分组（支持移动分组层级） |
| `delete_group` | `id: String` | `CommandResult<SuccessResponse>` | 删除分组，该分组下的笔记自动移出（group_id 设为 NULL） |
| `reorder_groups` | `orders: Vec<(String, i32)>` | `CommandResult<SuccessResponse>` | 批量更新分组排序，参数为 [groupId, sortOrder] 数组 |

### 4.4 settings -- 设置命令

| 命令 | 参数 | 返回类型 | 功能描述 |
|------|------|---------|---------|
| `get_setting` | `key: String` | `CommandResult<Option<String>>` | 获取单个设置项的值，不存在返回 null |
| `set_setting` | `key: String`, `value: String` | `CommandResult<()>` | 保存设置项，存在则更新，不存在则创建（INSERT OR REPLACE） |
| `get_all_settings` | （无参数） | `CommandResult<Vec<SettingItem>>` | 获取所有设置项列表 |

### 4.5 window -- 窗口命令

| 命令 | 参数 | 返回类型 | 功能描述 |
|------|------|---------|---------|
| `create_floating` | `label: String`, `title: Option<String>`, `width: f64`, `height: f64`, `x: Option<f64>`, `y: Option<f64>`, `always_on_top: Option<bool>`, `transparent: Option<bool>`, `opacity: Option<f64>`, `skip_taskbar: Option<bool>`, `resizable: Option<bool>`, `decorations: Option<bool>` | `CommandResult<SuccessResponse>` | 创建悬浮笔记窗，加载 /floating 路由页面，默认无边框置顶 |
| `close_floating` | `label: String` | `CommandResult<SuccessResponse>` | 关闭指定标签的悬浮窗并从状态中移除 |
| `update_floating_config` | `label: String`, `title: Option<String>`, `width: f64`, `height: f64`, `x: Option<f64>`, `y: Option<f64>`, `always_on_top: Option<bool>`, `transparent: Option<bool>`, `opacity: Option<f64>`, `skip_taskbar: Option<bool>`, `resizable: Option<bool>`, `decorations: Option<bool>` | `CommandResult<SuccessResponse>` | 更新悬浮窗的位置、大小、置顶等配置 |
| `toggle_penetration` | `label: String`, `enabled: bool` | `CommandResult<SuccessResponse>` | 切换悬浮窗的鼠标穿透模式 |
| `list_floatings` | （无参数） | `CommandResult<Vec<FloatingConfig>>` | 获取所有已创建的悬浮窗配置列表 |

### 4.6 backup -- 备份命令

| 命令 | 参数 | 返回类型 | 功能描述 |
|------|------|---------|---------|
| `export_data` | （无参数） | `CommandResult<String>` | 将所有数据（笔记、分组、设置）导出为 JSON 字符串 |
| `export_to_file` | `path: String` | `CommandResult<String>` | 将所有数据导出并写入指定路径的 JSON 文件，返回文件路径 |
| `import_data` | `json: String`, `overwrite: Option<bool>` | `CommandResult<ImportResult>` | 从 JSON 字符串导入数据，overwrite=true 时覆盖已有数据 |
| `import_from_file` | `path: String`, `overwrite: Option<bool>` | `CommandResult<ImportResult>` | 从指定路径的 JSON 文件读取并导入数据 |

---

> **架构约定说明**
>
> 1. **分层原则**：前端通过 `@tauri-apps/api` 的 `invoke` 调用 Rust 命令，命令层（commands/）负责参数校验和类型转换，数据库层（db/）负责 SQL 操作，两者严格分离。
> 2. **错误处理**：所有命令返回 `Result<T, String>`，错误信息为中文可读字符串，前端统一通过 `.catch` 或 `Result::Err` 处理。
> 3. **连接池**：使用 `r2d2` + `r2d2_sqlite` 管理数据库连接池，通过 Tauri `State` 注入，避免每次命令创建新连接。
> 4. **数据安全**：`crypto` 模块提供 AES-256-GCM 加密/解密能力，密钥通过 `Mutex<Option<Vec<u8>>>` 管理，仅在用户解锁后驻留内存。
> 5. **窗口管理**：主窗口关闭时拦截并隐藏至系统托盘，悬浮窗通过 `FloatingState` 管理生命周期。
> 6. **命名规范**：前端组件统一 `Br` 前缀；Rust 模块按领域（notes/groups/settings/window/backup）划分；数据库字段使用 `snake_case`。
