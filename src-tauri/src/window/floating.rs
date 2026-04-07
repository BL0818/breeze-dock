use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};

/// 悬浮窗权限层级
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FloatingSecurityLevel {
    Normal = 0,      // 普通：无任何保护
    Protected = 1,   // 受保护：需要密码
    HighSecurity = 2, // 高安全：密码 + 防截屏
}

/// 悬浮窗安全状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FloatingSecurityState {
    pub is_locked: bool,
    pub password_hash: Option<String>,
    pub security_level: FloatingSecurityLevel,
    pub is_incognito: bool,
}

impl Default for FloatingSecurityState {
    fn default() -> Self {
        Self {
            is_locked: false,
            password_hash: None,
            security_level: FloatingSecurityLevel::Normal,
            is_incognito: false,
        }
    }
}

/// 悬浮窗配置参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FloatingConfig {
    /// 窗口标签（唯一标识符）
    pub label: String,
    /// 关联的笔记 ID
    pub note_id: Option<String>,
    /// 窗口标题
    pub title: Option<String>,
    /// 窗口宽度
    pub width: f64,
    /// 窗口高度
    pub height: f64,
    /// 窗口 X 坐标
    pub x: Option<f64>,
    /// 窗口 Y 坐标
    pub y: Option<f64>,
    /// 是否置顶
    pub always_on_top: Option<bool>,
    /// 是否透明
    pub transparent: Option<bool>,
    /// 透明度 (0.0 - 1.0)
    pub opacity: Option<f64>,
    /// 是否跳过任务栏
    pub skip_taskbar: Option<bool>,
    /// 是否可调整大小
    pub resizable: Option<bool>,
    /// 是否显示装饰（标题栏）
    pub decorations: Option<bool>,
    /// 安全层级
    pub security_level: Option<FloatingSecurityLevel>,
    /// 是否为无痕模式
    pub is_incognito: Option<bool>,
}

/// 悬浮窗状态管理
pub struct FloatingState {
    /// 已创建的悬浮窗列表
    pub windows: Mutex<HashMap<String, FloatingConfig>>,
    /// 悬浮窗安全状态（密码、锁定状态等）
    pub security_states: Mutex<HashMap<String, FloatingSecurityState>>,
    /// 全局无痕模式标志
    pub incognito_mode: AtomicBool,
    /// 无痕浮窗标签集合
    pub incognito_windows: Mutex<Vec<String>>,
}

impl FloatingState {
    pub fn new() -> Self {
        Self {
            windows: Mutex::new(HashMap::new()),
            security_states: Mutex::new(HashMap::new()),
            incognito_mode: AtomicBool::new(false),
            incognito_windows: Mutex::new(Vec::new()),
        }
    }
}

impl Default for FloatingState {
    fn default() -> Self {
        Self::new()
    }
}

/// 创建悬浮窗
pub fn create_floating_window(app: &AppHandle, config: FloatingConfig) -> Result<(), String> {
    let label = config.label.clone();

    // 检查是否已存在同名窗口
    if app.get_webview_window(&label).is_some() {
        return Err(format!("窗口 {} 已存在", label));
    }

    // 构建 URL
    // 开发模式：使用 dev server URL（WebviewUrl::App 在动态窗口中不走 dev server）
    // 生产模式：使用 App URL 加载打包资源
    #[cfg(debug_assertions)]
    let url = WebviewUrl::External("http://localhost:1420/".parse().unwrap());
    #[cfg(not(debug_assertions))]
    let url = WebviewUrl::App("index.html".into());
    eprintln!("[create_floating_window] 创建窗口, noteId={}", config.note_id.clone().unwrap_or_default());

    let mut builder = WebviewWindowBuilder::new(app, &label, url)
        .inner_size(config.width, config.height)
        .title(config.title.as_deref().unwrap_or("BreezeNote Floating"))
        .resizable(true)
        .always_on_top(true);

    let window = builder.build()
        .map_err(|e| format!("创建悬浮窗失败: {}", e))?;

    // 开发模式下自动打开 devtools 便于调试
    #[cfg(debug_assertions)]
    {
        window.open_devtools();
    }

    // 设置窗口透明度（Windows 平台）
    #[cfg(windows)]
    {
        if let Some(opacity) = config.opacity {
            if let Err(e) = set_window_opacity_windows(&window, opacity) {
                eprintln!("[floating] 设置透明度失败: {}", e);
            }
        }
    }

    // 保存到状态
    let state = app.state::<FloatingState>();
    let mut windows = state.windows.lock()
        .map_err(|e| format!("获取窗口状态锁失败: {}", e))?;
    windows.insert(label, config);

    Ok(())
}

/// 关闭悬浮窗
pub fn close_floating_window(app: &AppHandle, label: &str) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(label) {
        window.close()
            .map_err(|e| format!("关闭窗口失败: {}", e))?;

        // 从状态中移除
        let state = app.state::<FloatingState>();
        let mut windows = state.windows.lock()
            .map_err(|e| format!("获取窗口状态锁失败: {}", e))?;
        windows.remove(label);
        Ok(())
    } else {
        Err(format!("窗口 {} 不存在", label))
    }
}

/// 更新悬浮窗配置
pub fn update_floating_config(app: &AppHandle, config: FloatingConfig) -> Result<(), String> {
    let window = app.get_webview_window(&config.label)
        .ok_or_else(|| format!("窗口 {} 不存在", config.label))?;

    // 更新窗口大小
    window.set_size(tauri::LogicalSize::new(config.width, config.height))
        .map_err(|e| format!("设置窗口大小失败: {}", e))?;

    // 更新窗口位置
    if let (Some(x), Some(y)) = (config.x, config.y) {
        window.set_position(tauri::LogicalPosition::new(x, y))
            .map_err(|e| format!("设置窗口位置失败: {}", e))?;
    }

    // 更新窗口透明度（Windows 平台）
    #[cfg(windows)]
    {
        if let Some(opacity) = config.opacity {
            set_window_opacity_windows(&window, opacity)?;
        }
    }

    // 更新置顶状态
    if let Some(always_on_top) = config.always_on_top {
        window.set_always_on_top(always_on_top)
            .map_err(|e| format!("设置置顶失败: {}", e))?;
    }

    // 更新状态
    let state = app.state::<FloatingState>();
    let mut windows = state.windows.lock()
        .map_err(|e| format!("获取窗口状态锁失败: {}", e))?;
    windows.insert(config.label.clone(), config);

    Ok(())
}

/// 切换鼠标穿透模式
/// 使用 Windows API 设置 WS_EX_TRANSPARENT 实现真正的系统级鼠标穿透
#[cfg(windows)]
pub fn toggle_penetration(app: &AppHandle, label: &str, enabled: bool) -> Result<(), String> {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, SetWindowLongW,
        GWL_EXSTYLE, WS_EX_TRANSPARENT
    };

    let window = app.get_webview_window(label)
        .ok_or_else(|| format!("窗口 {} 不存在", label))?;

    let hwnd = window.hwnd()
        .map_err(|e| format!("获取窗口句柄失败: {}", e))?;

    unsafe {
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);

        if enabled {
            // 添加 WS_EX_TRANSPARENT 样式，让鼠标事件穿透到下层窗口
            SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style | (WS_EX_TRANSPARENT.0 as i32));
        } else {
            // 移除 WS_EX_TRANSPARENT 样式
            SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style & !(WS_EX_TRANSPARENT.0 as i32));
        }
    }

    Ok(())
}

#[cfg(not(windows))]
pub fn toggle_penetration(_app: &AppHandle, _label: &str, _enabled: bool) -> Result<(), String> {
    Ok(())
}

/// 设置窗口透明度（Windows 平台实现）
#[cfg(windows)]
fn set_window_opacity_windows(window: &tauri::WebviewWindow, opacity: f64) -> Result<(), String> {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, SetWindowLongW, SetLayeredWindowAttributes,
        GWL_EXSTYLE, WS_EX_LAYERED, LWA_ALPHA
    };

    let hwnd = window.hwnd()
        .map_err(|e| format!("获取窗口句柄失败: {}", e))?;

    unsafe {
        // 获取当前扩展样式
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);

        // 添加 WS_EX_LAYERED 样式（如果还没有）
        if ex_style & (WS_EX_LAYERED.0 as i32) == 0 {
            SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style | (WS_EX_LAYERED.0 as i32));
        }

        // 设置透明度 (0-255)，RGB 颜色参数设为 0（黑色）
        let alpha = (opacity.clamp(0.0, 1.0) * 255.0) as u8;
        SetLayeredWindowAttributes(hwnd, windows::Win32::Foundation::COLORREF(0), alpha, LWA_ALPHA)
            .map_err(|e| format!("设置窗口透明度失败: {:?}", e))?;
    }

    Ok(())
}

/// 获取所有悬浮窗列表
pub fn list_floating_windows(app: &AppHandle) -> Result<Vec<FloatingConfig>, String> {
    let state = app.state::<FloatingState>();
    let windows = state.windows.lock()
        .map_err(|e| format!("获取窗口状态锁失败: {}", e))?;
    Ok(windows.values().cloned().collect())
}

/// 检查窗口是否存在
pub fn floating_window_exists(app: &AppHandle, label: &str) -> bool {
    app.get_webview_window(label).is_some()
}

/// 获取窗口位置
pub fn get_window_position(app: &AppHandle, label: &str) -> Result<(f64, f64), String> {
    let window = app.get_webview_window(label)
        .ok_or_else(|| format!("窗口 {} 不存在", label))?;

    let pos = window.outer_position()
        .map_err(|e| format!("获取窗口位置失败: {}", e))?;

    Ok((pos.x as f64, pos.y as f64))
}

/// 获取窗口大小
pub fn get_window_size(app: &AppHandle, label: &str) -> Result<(f64, f64), String> {
    let window = app.get_webview_window(label)
        .ok_or_else(|| format!("窗口 {} 不存在", label))?;

    let size = window.outer_size()
        .map_err(|e| format!("获取窗口大小失败: {}", e))?;

    Ok((size.width as f64, size.height as f64))
}

// ============================================================
// 浮窗安全功能
// ============================================================

/// 锁定浮窗
pub fn lock_floating(app: &AppHandle, label: &str) -> Result<(), String> {
    let state = app.state::<FloatingState>();
    let mut security_states = state.security_states.lock()
        .map_err(|e| format!("获取安全状态锁失败: {}", e))?;

    let security_state = security_states.entry(label.to_string())
        .or_insert_with(FloatingSecurityState::default);

    security_state.is_locked = true;

    eprintln!("[lock_floating] 浮窗 {} 已锁定", label);
    Ok(())
}

/// 解锁浮窗（验证密码）
pub fn unlock_floating(app: &AppHandle, label: &str, password: &str) -> Result<bool, String> {
    let state = app.state::<FloatingState>();
    let mut security_states = state.security_states.lock()
        .map_err(|e| format!("获取安全状态锁失败: {}", e))?;

    // 如果没有密码设置，则直接解锁
    let security_state = security_states.entry(label.to_string())
        .or_insert_with(FloatingSecurityState::default);

    // 如果没有设置密码，则直接解锁
    if security_state.password_hash.is_none() {
        security_state.is_locked = false;
        eprintln!("[unlock_floating] 浮窗 {} 解锁成功（无密码）", label);
        return Ok(true);
    }

    // 验证密码（使用简单的哈希比较，实际生产应使用更安全的方法）
    let password_hash = hash_password(password);
    if security_state.password_hash.as_ref() == Some(&password_hash) {
        security_state.is_locked = false;
        eprintln!("[unlock_floating] 浮窗 {} 解锁成功", label);
        Ok(true)
    } else {
        eprintln!("[unlock_floating] 浮窗 {} 密码错误", label);
        Ok(false)
    }
}

/// 设置浮窗密码
pub fn set_floating_password(app: &AppHandle, label: &str, password: &str) -> Result<(), String> {
    let state = app.state::<FloatingState>();
    let mut security_states = state.security_states.lock()
        .map_err(|e| format!("获取安全状态锁失败: {}", e))?;

    let security_state = security_states.entry(label.to_string())
        .or_insert_with(FloatingSecurityState::default);

    let password_hash = hash_password(password);
    security_state.password_hash = Some(password_hash);
    security_state.security_level = FloatingSecurityLevel::Protected;

    eprintln!("[set_floating_password] 浮窗 {} 密码已设置", label);
    Ok(())
}

/// 清除浮窗密码
pub fn clear_floating_password(app: &AppHandle, label: &str) -> Result<(), String> {
    let state = app.state::<FloatingState>();
    let mut security_states = state.security_states.lock()
        .map_err(|e| format!("获取安全状态锁失败: {}", e))?;

    if let Some(security_state) = security_states.get_mut(label) {
        security_state.password_hash = None;
        security_state.security_level = FloatingSecurityLevel::Normal;
        eprintln!("[clear_floating_password] 浮窗 {} 密码已清除", label);
    }

    Ok(())
}

/// 检查浮窗是否已锁定
pub fn is_floating_locked(app: &AppHandle, label: &str) -> Result<bool, String> {
    let state = app.state::<FloatingState>();
    let security_states = state.security_states.lock()
        .map_err(|e| format!("获取安全状态锁失败: {}", e))?;

    match security_states.get(label) {
        Some(security_state) => Ok(security_state.is_locked),
        None => Ok(false),
    }
}

/// 获取浮窗安全状态
pub fn get_floating_security_state(app: &AppHandle, label: &str) -> Result<FloatingSecurityState, String> {
    let state = app.state::<FloatingState>();
    let security_states = state.security_states.lock()
        .map_err(|e| format!("获取安全状态锁失败: {}", e))?;

    Ok(security_states.get(label).cloned().unwrap_or_default())
}

/// 设置浮窗安全层级
pub fn set_floating_security_level(app: &AppHandle, label: &str, level: FloatingSecurityLevel) -> Result<(), String> {
    let state = app.state::<FloatingState>();
    let mut security_states = state.security_states.lock()
        .map_err(|e| format!("获取安全状态锁失败: {}", e))?;

    let security_state = security_states.entry(label.to_string())
        .or_insert_with(FloatingSecurityState::default);

    security_state.security_level = level;

    eprintln!("[set_floating_security_level] 浮窗 {} 安全层级已设置为 {:?}", label, level);
    Ok(())
}

// ============================================================
// 无痕模式功能
// ============================================================

/// 创建无痕浮窗
pub fn create_incognito_floating(app: &AppHandle, note_id: &str, x: Option<f64>, y: Option<f64>, width: Option<f64>, height: Option<f64>) -> Result<String, String> {
    let state = app.state::<FloatingState>();

    // 设置全局无痕模式
    state.incognito_mode.store(true, Ordering::SeqCst);

    let label = format!("incognito-{}", note_id);

    // 如果窗口已存在，先关闭
    if app.get_webview_window(&label).is_some() {
        close_floating_window(app, &label)?;
    }

    let config = FloatingConfig {
        label: label.clone(),
        note_id: Some(note_id.to_string()),
        title: None,
        width: width.unwrap_or(320.0),
        height: height.unwrap_or(400.0),
        x,
        y,
        always_on_top: Some(true),
        transparent: Some(false),
        opacity: Some(1.0),
        skip_taskbar: Some(true),
        resizable: Some(true),
        decorations: Some(false),
        security_level: Some(FloatingSecurityLevel::Normal),
        is_incognito: Some(true),
    };

    create_floating_window(app, config)?;

    // 添加到无痕窗口列表
    let mut incognito_windows = state.incognito_windows.lock()
        .map_err(|e| format!("获取无痕窗口锁失败: {}", e))?;
    if !incognito_windows.contains(&label) {
        incognito_windows.push(label.clone());
    }

    // 设置该窗口的无痕状态
    let mut security_states = state.security_states.lock()
        .map_err(|e| format!("获取安全状态锁失败: {}", e))?;
    let security_state = security_states.entry(label.clone())
        .or_insert_with(FloatingSecurityState::default);
    security_state.is_incognito = true;

    eprintln!("[create_incognito_floating] 创建无痕浮窗 {}", label);
    Ok(label)
}

/// 关闭无痕浮窗（自动销毁，不保存任何数据）
pub fn close_incognito_floating(app: &AppHandle, label: &str) -> Result<(), String> {
    let state = app.state::<FloatingState>();

    // 从无痕列表中移除，并检查是否还有剩余
    let incognito_count = {
        let mut incognito_windows = state.incognito_windows.lock()
            .map_err(|e| format!("获取无痕窗口锁失败: {}", e))?;
        incognito_windows.retain(|w| w != label);
        incognito_windows.len()
    };

    // 移除安全状态
    {
        let mut security_states = state.security_states.lock()
            .map_err(|e| format!("获取安全状态锁失败: {}", e))?;
        security_states.remove(label);
    }

    // 从窗口列表中移除
    {
        let mut windows = state.windows.lock()
            .map_err(|e| format!("获取窗口状态锁失败: {}", e))?;
        windows.remove(label);
    }

    // 关闭窗口
    if let Some(window) = app.get_webview_window(label) {
        window.close()
            .map_err(|e| format!("关闭窗口失败: {}", e))?;
    }

    // 如果没有更多无痕窗口，关闭全局无痕模式
    if incognito_count == 0 {
        state.incognito_mode.store(false, Ordering::SeqCst);
    }

    eprintln!("[close_incognito_floating] 无痕浮窗 {} 已销毁", label);
    Ok(())
}

/// 销毁所有无痕浮窗
pub fn destroy_all_incognito_floating(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<FloatingState>();

    let incognito_windows: Vec<String> = {
        let windows = state.incognito_windows.lock()
            .map_err(|e| format!("获取无痕窗口锁失败: {}", e))?;
        windows.clone()
    };

    for label in &incognito_windows {
        eprintln!("[destroy_all_incognito_floating] 销毁无痕浮窗 {}", label);

        // 关闭窗口
        if let Some(window) = app.get_webview_window(label) {
            let _ = window.close();
        }
    }

    // 清理所有状态
    {
        let mut security_states = state.security_states.lock()
            .map_err(|e| format!("获取安全状态锁失败: {}", e))?;
        security_states.clear();
    }

    // 清空窗口列表（只清无痕相关的）
    {
        let mut windows = state.windows.lock()
            .map_err(|e| format!("获取窗口状态锁失败: {}", e))?;
        for label in &incognito_windows {
            windows.remove(label);
        }
    }

    // 清空无痕窗口列表
    {
        let mut incognito_windows = state.incognito_windows.lock()
            .map_err(|e| format!("获取无痕窗口锁失败: {}", e))?;
        incognito_windows.clear();
    }

    state.incognito_mode.store(false, Ordering::SeqCst);

    eprintln!("[destroy_all_incognito_floating] 所有无痕浮窗已销毁");
    Ok(())
}

/// 检查全局无痕模式是否开启
pub fn is_incognito_mode(app: &AppHandle) -> bool {
    let state = app.state::<FloatingState>();
    state.incognito_mode.load(Ordering::SeqCst)
}

/// 检查窗口是否为无痕模式
pub fn is_window_incognito(app: &AppHandle, label: &str) -> Result<bool, String> {
    let state = app.state::<FloatingState>();
    let security_states = state.security_states.lock()
        .map_err(|e| format!("获取安全状态锁失败: {}", e))?;

    match security_states.get(label) {
        Some(security_state) => Ok(security_state.is_incognito),
        None => Ok(false),
    }
}

// ============================================================
// 密码哈希（简单实现，生产环境应使用更安全的算法）
// ============================================================

/// 简单的密码哈希函数
fn hash_password(password: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    password.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}
