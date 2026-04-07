//! 系统托盘模块
//!
//! 提供系统托盘图标、菜单和交互功能

pub mod icon;

use tauri::{
    AppHandle,
    Emitter,
    Manager,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState},
};

/// 托盘状态管理
pub struct TrayState {
    pub enabled: bool,
}

impl TrayState {
    pub fn new() -> Self {
        Self { enabled: true }
    }
}

impl Default for TrayState {
    fn default() -> Self {
        Self::new()
    }
}

/// 创建系统托盘（带完整右键菜单）
pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(feature = "tray-icon")]
    {
        let icon = icon::get_tray_icon();

        // 创建菜单项
        let menu = build_tray_menu(app)?;

        let _tray = TrayIconBuilder::with_id("main-tray")
            .icon(icon)
            .title("BreezeNote")
            .tooltip("BreezeNote - 轻量笔记工具")
            .menu(&menu)
            .show_menu_on_left_click(false) // 右键点击显示菜单
            .on_tray_icon_event(move |tray, event| {
                match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        // 左键单击：显示/隐藏主窗口
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    TrayIconEvent::Click {
                        button: MouseButton::Right,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        // 右键单击由 on_menu_event 处理
                    }
                    _ => {}
                }
            })
            .on_menu_event(move |app, event| {
                // 获取菜单项 ID
                let menu_id = event.id().as_ref();
                handle_menu_event(app, menu_id);
            })
            .build(app)?;

        println!("[tray] 系统托盘创建成功");
    }

    #[cfg(not(feature = "tray-icon"))]
    {
        eprintln!("[tray] tray-icon 功能未启用，请添加 --features tray-icon");
    }

    Ok(())
}

/// 构建托盘菜单
fn build_tray_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    // 新建笔记
    let new_note = MenuItem::with_id(app, "new_note", "新建笔记", true, None::<&str>)?;
    // 搜索
    let search = MenuItem::with_id(app, "search", "搜索", true, None::<&str>)?;
    // 设置
    let settings = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
    // 分隔线
    let separator = PredefinedMenuItem::separator(app)?;
    // 退出
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&new_note, &search, &settings, &separator, &quit])?;

    Ok(menu)
}

/// 处理菜单项点击事件
fn handle_menu_event(app: &AppHandle, menu_id: &str) {
    println!("[tray] 菜单项点击: {}", menu_id);

    match menu_id {
        "new_note" => {
            // 触发新建笔记事件
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                // 发送事件到前端
                let _ = window.emit("tray-new-note", ());
            }
        }
        "search" => {
            // 触发搜索事件
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                // 发送事件到前端打开搜索
                let _ = window.emit("tray-open-search", ());
            }
        }
        "settings" => {
            // 触发设置事件
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                // 发送事件到前端打开设置
                let _ = window.emit("tray-open-settings", ());
            }
        }
        "quit" => {
            // 退出应用
            println!("[tray] 用户请求退出应用");
            app.exit(0);
        }
        _ => {}
    }
}

/// 显示托盘
pub fn show_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
    Ok(())
}

/// 隐藏托盘（隐藏到托盘）
pub fn hide_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    Ok(())
}

/// 切换托盘显示状态
pub fn toggle_tray(app: &AppHandle) -> Result<bool, Box<dyn std::error::Error>> {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        if is_visible {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
        Ok(!is_visible)
    } else {
        Err("主窗口不存在".into())
    }
}

/// 设置托盘图标是否显示
pub fn set_tray_visible(app: &AppHandle, visible: bool) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(feature = "tray-icon")]
    {
        if let Some(tray) = app.tray_by_id("main-tray") {
            tray.set_visible(visible)
                .map_err(|e| format!("设置托盘可见性失败: {}", e))?;
        }
    }
    Ok(())
}
