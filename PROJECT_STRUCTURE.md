# BreezeNote 项目架构与开发规范

## 1. 项目概述

**名称**: BreezeNote
**定位**: 轻量、私密、流畅的本地 iOS 风格笔记工具
**核心栈**: Tauri (Rust) + React 18 + TypeScript + SQLite
**设计目标**: 极致性能、本地隐私优先、iOS 原生体验

## 2. 目录结构规范

```
breeze-note/
├── .tauri/                  # Tauri 配置
├── public/                  # 静态资源
├── src/                     # 前端源码 (React + TS)
│   ├── components/          # UI 组件 (严格 Br 前缀)
│   │   ├── ui/              # 原子组件 (Button, Input, Card)
│   │   └── layout/          # 布局组件 (Sidebar, WindowFrame)
│   ├── features/            # 业务功能模块 (核心逻辑)
│   │   ├── editor/          # 编辑器 (自动保存, 模板)
│   │   ├── search/          # 搜索 (Fuse.js, 高亮)
│   │   ├── floating/        # 悬浮窗逻辑 (穿透, 贴边)
│   │   └── security/        # 安全 (密码锁, 无痕)
│   ├── hooks/               # 自定义 Hooks
│   ├── stores/              # Zustand 状态管理
│   ├── styles/              # 全局样式 & UnoCSS 配置
│   ├── utils/               # 工具函数
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/               # Tauri 后端 (Rust)
│   ├── src/
│   │   ├── db/              # SQLite 操作 & 加密
│   │   ├── window/          # 窗口管理 (多窗口, 托盘)
│   │   ├── fs/              # 文件系统 & 备份
│   │   └── main.rs          # Rust 入口
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── uno.config.ts            # UnoCSS 配置
└── vite.config.ts
```

## 3. 开发原则 (必须遵守)

### 3.1 命名规范

- **组件**: 所有 React 组件必须以 `Br` 开头 (例如 `BrNoteCard`, `BrSidebar`)
- **文件**: 组件文件使用 PascalCase (例如 `BrNoteCard.tsx`)，工具文件使用 camelCase
- **样式**: 100% 使用 UnoCSS 原子类，禁止编写自定义 CSS 文件 (除非必要)

### 3.2 状态管理

- 使用 **Zustand** 进行全局状态管理
- 避免在组件内部维护复杂的状态，尽量提升到 Store 中
- Store 文件应模块化 (例如 `useNoteStore.ts`, `useSettingStore.ts`)

### 3.3 数据库与后端

- **SQLite**: 所有数据持久化必须通过 Rust 端的 SQLite 操作
- **类型安全**: Rust 与 TypeScript 之间的数据传输必须定义明确的 Interface/Struct
- **加密**: 敏感字段必须在写入数据库前进行 AES 加密

### 3.4 UI/UX 风格

- **iOS 风格**: 大圆角 (`rounded-ios`), 毛玻璃背景 (`bg-opacity`), 柔和阴影
- **交互**: 必须有平滑的过渡动画 (`transition-all duration-200`)
- **响应式**: 必须适配不同窗口大小，但优先优化桌面端体验

## 4. 核心功能模块定义

### 4.1 笔记核心 (Core)

- **自动保存**: 监听内容变化，防抖 (Debounce 500ms) 写入数据库
- **版本回溯**: 每次保存时，将旧内容快照写入 `note_history` 表

### 4.2 悬浮窗 (Floating)

- 使用 Tauri 的多窗口能力 (`appWindow.create`)
- 必须实现"鼠标穿透"功能 (点击穿透到桌面)
- 必须实现"贴边自动收起"

### 4.3 搜索 (Search)

- 前端使用 `Fuse.js` 进行模糊搜索
- 支持拼音首字母搜索
- 搜索结果必须高亮关键词

### 4.4 安全 (Security)

- **无痕模式**: 数据仅存储在内存变量中，不写入 SQLite，应用关闭即销毁
- **密码锁**: 应用启动时校验密码，校验通过后才初始化主窗口

## 5. 技术栈配置要求

### 5.1 前端依赖

```
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "zustand": "^4",
    "fuse.js": "^6",
    "uuid": "^9",
    "dayjs": "^1"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^4",
    "unocss": "^0",
    "@tauri-apps/cli": "^1"
  }
}
```

### 5.2 Rust 依赖

```
[dependencies]
tauri = { version = "1", features = ["api-all"] }
rusqlite = { version = "0.28", features = ["bundled"] }
r2d2 = "0.8"
aes-gcm = "0.10"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
base64 = "0.21"
```

### 5.3 UnoCSS 配置

```
// uno.config.ts
import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [presetUno(), presetIcons()],
  theme: {
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      success: '#34C759',
      danger: '#FF3B30',
      background: '#F2F2F7',
      surface: '#FFFFFF',
    },
    borderRadius: {
      ios: '12px',
      'ios-lg': '20px',
    }
  },
  shortcuts: {
    'ios-card': 'bg-surface rounded-ios shadow-sm border border-gray-100/50',
    'ios-btn': 'bg-primary text-white rounded-ios font-medium active:opacity-80 transition-opacity',
  }
})
```

## 6. 开发流程约定

### 6.1 代码审查要点

1. **组件命名**：确保所有组件以 `Br` 开头
2. **样式规范**：100% 使用 UnoCSS，禁止自定义 CSS
3. **类型安全**：所有变量必须有明确的类型定义
4. **加密验证**：敏感数据必须经过 AES 加密
5. **性能优化**：防抖、节流等优化措施必须到位

### 6.2 测试要求

1. **单元测试**：核心逻辑必须有单元测试覆盖
2. **集成测试**：跨模块交互需要集成测试
3. **UI 测试**：关键用户路径需要 UI 自动化测试
4. **性能测试**：大数据量场景下的性能测试

## 7. 配合提示词使用建议

当给开发 Agent 下指令时，在提示词开头添加：

"你现在是 BreezeNote 项目的核心开发 Agent。请先阅读根目录下的 `PROJECT_STRUCTURE.md` 文件，严格遵循其中的目录结构、命名规范（特别是 Br 前缀和 UnoCSS）以及技术栈要求进行开发。不要违背架构文档中的任何约定。"

## 8. 版本控制策略

### 8.1 分支策略

- **main**: 稳定发布版本
- **develop**: 集成开发版本
- **feature/**: 功能开发分支
- **hotfix/**: 紧急修复分支

### 8.2 版本号规范

使用语义化版本号：`MAJOR.MINOR.PATCH`

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的功能新增
- **PATCH**: 向后兼容的问题修复

## 9. 安全与隐私保障

### 9.1 数据安全

1. **本地存储**: 所有数据必须存储在本地 SQLite 数据库
2. **数据加密**: 敏感数据必须使用 AES-256 加密
3. **密码保护**: 支持应用密码锁和系统生物识别

### 9.2 隐私保护

1. **无痕模式**: 提供完全不存储数据的使用模式
2. **数据隔离**: 不同用户数据严格隔离
3. **权限最小化**: 只申请必要的系统权限

## 10. 性能优化目标

### 10.1 启动性能

- **冷启动**: < 1.5s (中等配置电脑)
- **热启动**: < 0.5s

### 10.2 运行性能

- **响应延迟**: < 100ms 用户操作响应
- **内存占用**: < 100MB (空闲状态)
- **CPU 占用**: < 5% (空闲状态)

### 10.3 搜索性能

- **1000条数据**: 搜索响应 < 200ms
- **10000条数据**: 搜索响应 < 500ms

## 结语

本架构文档定义了 BreezeNote 项目的完整技术方案和开发规范，所有开发人员必须严格遵守。通过统一的技术栈、规范的目录结构和明确的开发原则，确保项目能够高效、稳定地推进，最终打造出符合设计目标的优质产品。

