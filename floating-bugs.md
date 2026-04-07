# 浮窗功能 Bug 记录

> 创建时间：2026-04-02
> 状态：待修复

---

## 1. 透明度调节失效

### 问题描述
- 拖动透明度滑块后，浮窗透明度没有正确更新
- 透明度值虽然写入了 localStorage，但视觉上没有生效

### 相关文件
- `src/features/floating/BrFloatingCard.tsx` - `handleOpacityChange` 函数
- `src/components/layout/BrFloatingContainer.tsx` - 配置状态管理

### 期望行为
拖动滑块时，浮窗内容区域的透明度应该实时变化

### 可能原因
- `contentOpacity` 状态与实际渲染的透明度可能不同步
- 后端 `update_floating_config` 调用可能没有正确更新窗口透明度

---

## 2. 鼠标穿透切换失效

### 问题描述
- 点击穿透图标（眼睛/眼睛关闭）后，穿透状态没有正确切换
- 穿透开启后内容区域应该可以鼠标穿透（clickthrough），但实际不生效

### 相关文件
- `src/features/floating/BrFloatingCard.tsx` - `handleTogglePenetrable` 函数
- `src-tauri/src/window/floating.rs` - `toggle_penetration` 函数
- `src-tauri/src/commands/window.rs` - `toggle_penetration` 命令

### 期望行为
- 点击穿透图标时，调用后端 `toggle_penetration` 命令
- 穿透开启后，鼠标事件应该穿过内容区域

### 可能原因
- 后端 Windows API `WS_EX_TRANSPARENT` 设置可能不正确
- 或者 `pointer-events-none` CSS 没有正确应用到内容区域

---

## 修复方向建议

### 透明度调节
1. 确认 `update_floating_config` 后端调用是否正确
2. 检查 `contentOpacity` 状态是否正确同步到渲染
3. 验证 Windows `SetLayeredWindowAttributes` API 是否正确调用

### 鼠标穿透
1. 使用 `Invoke` 直接调用后端命令，验证后端是否正确执行
2. 检查前端 `config.isPenetrable` 状态是否正确传递到内容区域的 `pointer-events-none`
3. 考虑使用 `setIgnoreCursorEvents` API 替代 `WS_EX_TRANSPARENT`
