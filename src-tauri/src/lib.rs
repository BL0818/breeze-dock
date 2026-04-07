// BreezeNote - 轻量、私密、流畅的本地笔记工具
// Tauri v2 + SQLite + AES-256-GCM 加密

mod commands;
mod crypto;
mod db;
mod fs;
mod window;
mod tray;

use std::sync::{Mutex, atomic::AtomicBool};
use db::DbState;
use window::floating::FloatingState;
use tray::TrayState;
use tauri::{Manager, Emitter};

/// 应用状态（用于内存安全）
pub struct AppState {
    /// 加密密钥（锁定时清除）
    pub encryption_key: Mutex<Option<Vec<u8>>>,
    /// 全局无痕模式
    pub incognito_mode: AtomicBool,
    /// 屏幕捕获是否被阻止
    pub screen_capture_prevented: AtomicBool,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            encryption_key: Mutex::new(None),
            incognito_mode: AtomicBool::new(false),
            screen_capture_prevented: AtomicBool::new(false),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

/// 应用库入口，供 main.rs 调用
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化数据库
    let db_path = db::get_db_path()
        .expect("无法确定数据库路径");
    let db_state = DbState::new(db_path.to_str().unwrap())
        .expect("数据库初始化失败");

    // 构建并运行 Tauri 应用
    tauri::Builder::default()
        // 注册插件
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // 注册全局状态
        .manage(db_state)
        .manage(FloatingState::new())
        .manage(AppState::new())
        // 注册所有 Tauri Commands
        .invoke_handler(tauri::generate_handler![
            // 笔记命令
            commands::notes::create_note,
            commands::notes::get_note,
            commands::notes::update_note,
            commands::notes::delete_note,
            commands::notes::trash_note,
            commands::notes::restore_note,
            commands::notes::get_notes,
            commands::notes::search_notes,
            commands::notes::pin_note,
            commands::notes::star_note,
            commands::notes::archive_note,
            commands::notes::reorder_notes,
            commands::notes::get_note_history,
            commands::notes::rollback_note,
            commands::notes::get_trash_notes,
            commands::notes::empty_trash,
            // 设置命令
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::get_all_settings,
            commands::settings::autostart_enable,
            commands::settings::autostart_disable,
            commands::settings::autostart_status,
            // 分组命令
            commands::groups::create_group,
            commands::groups::get_groups,
            commands::groups::get_group_by_id,
            commands::groups::update_group,
            commands::groups::delete_group,
            commands::groups::reorder_groups,
            commands::groups::get_child_groups,
            commands::groups::get_group_tree,
            commands::groups::get_note_count_by_group,
            // 窗口命令
            commands::window::create_floating,
            commands::window::close_floating,
            commands::window::close_all_floating_windows,
            commands::window::update_floating_config,
            commands::window::toggle_penetration,
            commands::window::list_floatings,
            commands::window::set_window_opacity,
            commands::window::floating_exists,
            commands::window::get_floating_position,
            commands::window::get_floating_config_from_db,
            commands::window::save_floating_config,
            commands::window::dock_floating_window,
            commands::window::undock_floating_window,
            commands::window::toggle_main_window,
            commands::window::set_window_always_on_top,
            commands::window::create_floating_note,
            commands::window::update_floating_position,
            commands::window::toggle_floating_always_on_top,
            commands::window::get_floating_config,
            // 浮窗安全命令
            commands::window::lock_floating,
            commands::window::unlock_floating,
            commands::window::set_floating_password,
            commands::window::clear_floating_password,
            commands::window::is_floating_locked,
            commands::window::get_floating_security_state,
            commands::window::set_floating_security_level,
            // 无痕模式命令
            commands::window::create_incognito_floating,
            commands::window::close_incognito_floating,
            commands::window::destroy_all_incognito_floating,
            commands::window::is_incognito_mode,
            commands::window::is_window_incognito,
            // 安全策略命令
            commands::window::prevent_screen_capture,
            commands::window::is_screen_capture_prevented,
            commands::window::detect_debugger,
            commands::window::get_security_status,
            commands::window::check_main_window_close_security,
            // 快捷键命令
            commands::shortcuts::show_main_window,
            commands::shortcuts::hide_main_window,
            commands::shortcuts::is_main_window_visible,
            // 备份命令
            commands::backup::export_data,
            commands::backup::export_to_file,
            commands::backup::import_data,
            commands::backup::import_from_file,
            // 标签命令
            commands::tags::create_tag,
            commands::tags::get_tags,
            commands::tags::get_tag_by_id,
            commands::tags::update_tag,
            commands::tags::delete_tag,
            commands::tags::add_note_tag,
            commands::tags::remove_note_tag,
            commands::tags::get_note_tags,
            commands::tags::get_notes_by_tag,
            commands::tags::get_note_count_by_tag,
            // 剪贴板命令
            commands::clipboard::read_clipboard,
            commands::clipboard::write_clipboard,
            commands::clipboard::clear_clipboard,
            // 安全命令
            commands::security::set_password,
            commands::security::verify_password_cmd,
            commands::security::remove_password,
            commands::security::enable_incognito,
            commands::security::is_incognito,
            commands::security::lock_app,
            commands::security::is_password_set,
            commands::security::is_encryption_enabled,
            commands::security::is_app_locked,
            commands::security::get_encryption_stats,
            commands::security::unlock_app,
            // 加密备份命令
            commands::backup::export_data_encrypted,
            commands::backup::import_data_encrypted,
        ])
        // 窗口事件处理
        .setup(|app| {
            let setup_start = std::time::Instant::now();
            println!("[setup] 应用启动中...");

            let window = app.get_webview_window("main").expect("无法获取主窗口");

            // 隐藏窗口，等待前端加载完成后再显示
            let _ = window.hide();
            println!("[setup] 主窗口已隐藏，等待前端加载完成");

            // 监听窗口关闭事件，改为显示确认弹窗
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                match event {
                    tauri::WindowEvent::CloseRequested { api, .. } => {
                        // 阻止默认关闭行为，发送事件到前端显示确认弹窗
                        api.prevent_close();
                        let _ = window_clone.emit("window-close-requested", ());
                    }
                    _ => {}
                }
            });

            // 初始化系统托盘
            if let Err(e) = tray::create_tray(app.handle()) {
                eprintln!("[setup] 创建系统托盘失败: {}", e);
            }

            println!("[setup] 应用初始化完成，耗时: {:?}", setup_start.elapsed());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
