//! 剪贴板命令
//!
//! 提供系统剪贴板的读写功能

use crate::commands::{CommandResult, SuccessResponse};

/// 从剪贴板读取文本内容
#[tauri::command]
pub fn read_clipboard() -> CommandResult<String> {
    #[cfg(desktop)]
    {
        use arboard::Clipboard;

        let mut clipboard = Clipboard::new()
            .map_err(|e| format!("无法访问剪贴板: {}", e))?;

        match clipboard.get_text() {
            Ok(text) => Ok(text),
            Err(_) => Ok(String::new()),
        }
    }

    #[cfg(not(desktop))]
    {
        Err("剪贴板功能仅在桌面平台可用".to_string())
    }
}

/// 写入文本到剪贴板
#[tauri::command]
pub fn write_clipboard(text: String) -> CommandResult<SuccessResponse> {
    #[cfg(desktop)]
    {
        use arboard::Clipboard;

        let mut clipboard = Clipboard::new()
            .map_err(|e| format!("无法访问剪贴板: {}", e))?;

        clipboard.set_text(&text)
            .map_err(|e| format!("写入剪贴板失败: {}", e))?;

        Ok(SuccessResponse::ok())
    }

    #[cfg(not(desktop))]
    {
        Err("剪贴板功能仅在桌面平台可用".to_string())
    }
}

/// 清空剪贴板
#[tauri::command]
pub fn clear_clipboard() -> CommandResult<SuccessResponse> {
    #[cfg(desktop)]
    {
        use arboard::Clipboard;

        let mut clipboard = Clipboard::new()
            .map_err(|e| format!("无法访问剪贴板: {}", e))?;

        clipboard.set_text("")
            .map_err(|e| format!("清空剪贴板失败: {}", e))?;

        Ok(SuccessResponse::ok())
    }

    #[cfg(not(desktop))]
    {
        Err("剪贴板功能仅在桌面平台可用".to_string())
    }
}
