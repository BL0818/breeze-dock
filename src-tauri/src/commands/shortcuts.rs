use crate::commands::{CommandResult, SuccessResponse};
use tauri::{AppHandle, Manager};

/// 显示主窗口（从托盘呼出）
#[tauri::command]
pub fn show_main_window(app: AppHandle) -> CommandResult<SuccessResponse> {
    if let Some(window) = app.get_webview_window("main") {
        window.show()
            .map_err(|e| format!("显示主窗口失败: {}", e))?;
        window.set_focus()
            .map_err(|e| format!("聚焦主窗口失败: {}", e))?;
    } else {
        return Err("主窗口不存在".to_string());
    }
    Ok(SuccessResponse::ok())
}

/// 隐藏主窗口（最小化到托盘）
#[tauri::command]
pub fn hide_main_window(app: AppHandle) -> CommandResult<SuccessResponse> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide()
            .map_err(|e| format!("隐藏主窗口失败: {}", e))?;
    }
    Ok(SuccessResponse::ok())
}

/// 检查主窗口是否可见
#[tauri::command]
pub fn is_main_window_visible(app: AppHandle) -> CommandResult<bool> {
    if let Some(window) = app.get_webview_window("main") {
        let visible = window.is_visible()
            .map_err(|e| format!("检查窗口可见性失败: {}", e))?;
        Ok(visible)
    } else {
        Ok(false)
    }
}
