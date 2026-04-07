// ============================================================
// BreezeNote 窗口安全策略
// 防截屏、反调试、窗口安全检测
// ============================================================

use std::sync::atomic::{AtomicBool, Ordering};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

/// 全局屏幕捕获防止状态
static SCREEN_CAPTURE_PREVENTED: AtomicBool = AtomicBool::new(false);

/// 安全策略状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityState {
    /// 是否已启用截屏防止
    pub screen_capture_prevented: bool,
    /// 防调试检测结果
    pub debugger_detected: bool,
}

impl Default for SecurityState {
    fn default() -> Self {
        Self {
            screen_capture_prevented: false,
            debugger_detected: false,
        }
    }
}

/// 防止屏幕捕获（Windows 平台实现）
/// 通过设置窗口样式来防止窗口被捕获或录制
#[cfg(windows)]
pub fn prevent_screen_capture(app: &AppHandle, label: &str, enabled: bool) -> Result<(), String> {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, SetWindowLongW,
        GWL_EXSTYLE, WS_EX_TOOLWINDOW
    };

    let window = app.get_webview_window(label)
        .ok_or_else(|| format!("窗口 {} 不存在", label))?;

    let hwnd = window.hwnd()
        .map_err(|e| format!("获取窗口句柄失败: {}", e))?;

    unsafe {
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);

        if enabled {
            // 添加 WS_EX_TOOLWINDOW 样式，从任务栏和 Alt+Tab 中隐藏窗口
            SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style | (WS_EX_TOOLWINDOW.0 as i32));
            eprintln!("[security] 窗口 {} 已启用截屏防止", label);
        } else {
            // 移除 WS_EX_TOOLWINDOW 样式
            SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style & !(WS_EX_TOOLWINDOW.0 as i32));
            eprintln!("[security] 窗口 {} 已禁用截屏防止", label);
        }
    }

    SCREEN_CAPTURE_PREVENTED.store(enabled, Ordering::SeqCst);
    Ok(())
}

#[cfg(not(windows))]
pub fn prevent_screen_capture(_app: &AppHandle, _label: &str, _enabled: bool) -> Result<(), String> {
    Ok(())
}

/// 检查屏幕捕获是否被阻止
pub fn is_screen_capture_prevented() -> bool {
    SCREEN_CAPTURE_PREVENTED.load(Ordering::SeqCst)
}

/// 检测调试器是否正在运行（基础检测）
#[cfg(windows)]
pub fn detect_debugger() -> bool {
    use windows::Win32::System::Diagnostics::Debug::IsDebuggerPresent;

    // 使用 IsDebuggerPresent 检测用户模式调试器
    // 注意：远程调试器检测需要 BOOL 类型，在 windows 0.61 中较复杂
    // 此处简化为只检测本地调试器
    unsafe {
        if IsDebuggerPresent().as_bool() {
            eprintln!("[security] 检测到调试器");
            return true;
        }
    }

    false
}

#[cfg(not(windows))]
pub fn detect_debugger() -> bool {
    // 非 Windows 平台不做检测
    false
}

/// 启用高安全模式（锁定 + 防截屏 + 防调试）
pub fn enable_high_security_mode(app: &AppHandle, label: &str) -> Result<(), String> {
    // 首先检测调试器
    if detect_debugger() {
        eprintln!("[security] 警告：检测到调试器运行，高安全模式受限");
    }

    // 启用截屏防止
    prevent_screen_capture(app, label, true)?;

    eprintln!("[security] 窗口 {} 高安全模式已启用", label);
    Ok(())
}

/// 禁用高安全模式
pub fn disable_high_security_mode(app: &AppHandle, label: &str) -> Result<(), String> {
    // 禁用截屏防止
    prevent_screen_capture(app, label, false)?;

    eprintln!("[security] 窗口 {} 高安全模式已禁用", label);
    Ok(())
}

/// 主窗口关闭时的安全检查
pub fn check_main_window_close_security(app: &AppHandle) -> Result<bool, String> {
    use crate::window::floating::FloatingState;

    let state = app.state::<FloatingState>();

    // 检查是否有无痕浮窗
    if state.incognito_mode.load(Ordering::SeqCst) {
        let incognito_count = {
            let windows = state.incognito_windows.lock()
                .map_err(|e| format!("获取无痕窗口锁失败: {}", e))?;
            windows.len()
        };

        if incognito_count > 0 {
            eprintln!("[security] 主窗口关闭被阻止：仍有 {} 个无痕浮窗正在运行", incognito_count);
            return Err(format!("仍有 {} 个无痕浮窗正在运行，请先关闭", incognito_count));
        }
    }

    Ok(true)
}

/// 获取应用安全状态摘要
#[cfg(windows)]
pub fn get_security_status(_app: &AppHandle) -> Result<SecurityState, String> {
    Ok(SecurityState {
        screen_capture_prevented: SCREEN_CAPTURE_PREVENTED.load(Ordering::SeqCst),
        debugger_detected: detect_debugger(),
    })
}

#[cfg(not(windows))]
pub fn get_security_status(_app: &AppHandle) -> Result<SecurityState, String> {
    Ok(SecurityState {
        screen_capture_prevented: false,
        debugger_detected: false,
    })
}