use crate::commands::{CommandResult, SuccessResponse};
use crate::window::floating::{self, FloatingConfig, FloatingState, FloatingSecurityLevel};
use crate::window::security;
use tauri::{AppHandle, State, Manager};
use crate::db::floating as db_floating;
use crate::db::DbState;

/// 创建悬浮窗
#[tauri::command]
pub fn create_floating(
    app: AppHandle,
    state: State<FloatingState>,
    db: State<DbState>,
    label: String,
    #[allow(non_snake_case)]
    noteId: Option<String>,
    title: Option<String>,
    width: f64,
    height: f64,
    x: Option<f64>,
    y: Option<f64>,
    #[allow(non_snake_case)]
    alwaysOnTop: Option<bool>,
    transparent: Option<bool>,
    opacity: Option<f64>,
    #[allow(non_snake_case)]
    skipTaskbar: Option<bool>,
    resizable: Option<bool>,
    decorations: Option<bool>,
) -> CommandResult<SuccessResponse> {
    // 先尝试从数据库恢复配置
    let (final_x, final_y, final_width, final_height, final_opacity) = if let Some(ref nid) = noteId {
        match db.pool.get() {
            Ok(conn) => {
                match db_floating::get_config_by_note_id(&conn, nid) {
                    Ok(Some(config)) => {
                        (Some(config.x), Some(config.y), config.width, config.height, Some(config.opacity))
                    }
                    _ => (x, y, width, height, opacity)
                }
            }
            _ => (x, y, width, height, opacity)
        }
    } else {
        (x, y, width, height, opacity)
    };

    // 保存需要的值到变量，避免借用问题
    let config_label = label.clone();
    let config_x = final_x;
    let config_y = final_y;
    let config_width = final_width;
    let config_height = final_height;
    let config_opacity = final_opacity;

    // 克隆 noteId 供后续使用
    let note_id_for_config = noteId.clone().unwrap_or_default();

    let config = FloatingConfig {
        label,
        note_id: Some(note_id_for_config.clone()),
        title,
        width: final_width,
        height: final_height,
        x: final_x,
        y: final_y,
        always_on_top: alwaysOnTop,
        transparent,
        opacity: final_opacity,
        skip_taskbar: skipTaskbar,
        resizable,
        decorations,
        security_level: None,
        is_incognito: None,
    };

    floating::create_floating_window(&app, config)?;

    // 保存到数据库
    if let Some(nid) = noteId {
        let _ = db.pool.get().and_then(|conn| {
            // 检查是否已存在
            match db_floating::get_config_by_note_id(&conn, &nid) {
                Ok(None) => {
                    let _ = db_floating::create_config(
                        &conn,
                        &nid,
                        &config_label,
                        config_x.unwrap_or(100.0),
                        config_y.unwrap_or(100.0),
                        config_width,
                        config_height,
                        config_opacity.unwrap_or(1.0),
                    );
                }
                Ok(Some(existing)) => {
                    // 更新现有配置
                    let updates = db_floating::FloatingConfigUpdate {
                        x: config_x,
                        y: config_y,
                        width: Some(config_width),
                        height: Some(config_height),
                        opacity: config_opacity,
                        ..Default::default()
                    };
                    let _ = db_floating::update_config(&conn, &existing.id, &updates);
                }
                _ => {}
            }
            Ok(())
        });
    }

    Ok(SuccessResponse::ok())
}

/// 关闭悬浮窗
#[tauri::command]
pub fn close_floating(
    app: AppHandle,
    state: State<FloatingState>,
    db: State<DbState>,
    label: String,
) -> CommandResult<SuccessResponse> {
    // 先获取位置信息保存到数据库
    if let Ok((x, y)) = floating::get_window_position(&app, &label) {
        if let Ok((width, height)) = floating::get_window_size(&app, &label) {
            let _ = db.pool.get().and_then(|conn| {
                // 通过 label 查找配置
                match db_floating::get_config_by_label(&conn, &label) {
                    Ok(Some(config)) => {
                        let updates = db_floating::FloatingConfigUpdate {
                            x: Some(x),
                            y: Some(y),
                            width: Some(width),
                            height: Some(height),
                            ..Default::default()
                        };
                        let _ = db_floating::update_config(&conn, &config.id, &updates);
                    }
                    _ => {}
                }
                Ok(())
            });
        }
    }

    floating::close_floating_window(&app, &label)?;
    Ok(SuccessResponse::ok())
}

/// 更新悬浮窗配置
#[tauri::command]
pub fn update_floating_config(
    app: AppHandle,
    state: State<FloatingState>,
    db: State<DbState>,
    label: String,
    title: Option<String>,
    width: f64,
    height: f64,
    x: Option<f64>,
    y: Option<f64>,
    always_on_top: Option<bool>,
    transparent: Option<bool>,
    opacity: Option<f64>,
    skip_taskbar: Option<bool>,
    resizable: Option<bool>,
    decorations: Option<bool>,
) -> CommandResult<SuccessResponse> {
    // 从数据库获取 note_id
    let note_id = db.pool.get().ok().and_then(|conn| {
        db_floating::get_config_by_label(&conn, &label).ok().flatten().map(|c| c.note_id)
    });

    let config = FloatingConfig {
        label,
        note_id,
        title,
        width,
        height,
        x,
        y,
        always_on_top,
        transparent,
        opacity,
        skip_taskbar,
        resizable,
        decorations,
        security_level: None,
        is_incognito: None,
    };

    floating::update_floating_config(&app, config.clone())?;

    // 同步更新数据库
    let _ = db.pool.get().and_then(|conn| {
        match db_floating::get_config_by_label(&conn, &config.label) {
            Ok(Some(existing)) => {
                let updates = db_floating::FloatingConfigUpdate {
                    x: config.x,
                    y: config.y,
                    width: Some(config.width),
                    height: Some(config.height),
                    opacity: config.opacity,
                    ..Default::default()
                };
                let _ = db_floating::update_config(&conn, &existing.id, &updates);
            }
            _ => {}
        }
        Ok(())
    });

    Ok(SuccessResponse::ok())
}

/// 切换鼠标穿透模式
#[tauri::command]
pub fn toggle_penetration(
    app: AppHandle,
    state: State<FloatingState>,
    db: State<DbState>,
    label: String,
    enabled: bool,
) -> CommandResult<SuccessResponse> {
    floating::toggle_penetration(&app, &label, enabled)?;

    // 同步更新数据库
    let _ = db.pool.get().and_then(|conn| {
        match db_floating::get_config_by_label(&conn, &label) {
            Ok(Some(existing)) => {
                let updates = db_floating::FloatingConfigUpdate {
                    is_penetrable: Some(enabled),
                    ..Default::default()
                };
                let _ = db_floating::update_config(&conn, &existing.id, &updates);
            }
            _ => {}
        }
        Ok(())
    });

    Ok(SuccessResponse::ok())
}

/// 获取所有悬浮窗列表
#[tauri::command]
pub fn list_floatings(
    app: AppHandle,
    state: State<FloatingState>,
) -> CommandResult<Vec<FloatingConfig>> {
    let windows = floating::list_floating_windows(&app)?;
    Ok(windows)
}

/// 设置窗口透明度
#[tauri::command]
pub fn set_window_opacity(
    app: AppHandle,
    state: State<FloatingState>,
    db: State<DbState>,
    label: String,
    opacity: f64,
) -> CommandResult<SuccessResponse> {
    // 获取当前配置并更新
    if let Some(window) = app.get_webview_window(&label) {
        // 从数据库获取 note_id
        let note_id = db.pool.get().ok().and_then(|conn| {
            db_floating::get_config_by_label(&conn, &label).ok().flatten().map(|c| c.note_id)
        });

        let config = FloatingConfig {
            label: label.clone(),
            note_id,
            title: None,
            width: 320.0,
            height: 400.0,
            x: None,
            y: None,
            always_on_top: None,
            transparent: Some(true),
            opacity: Some(opacity),
            skip_taskbar: None,
            resizable: None,
            decorations: None,
            security_level: None,
            is_incognito: None,
        };

        floating::update_floating_config(&app, config)?;

        // 同步更新数据库
        let _ = db.pool.get().and_then(|conn| {
            match db_floating::get_config_by_label(&conn, &label) {
                Ok(Some(existing)) => {
                    let updates = db_floating::FloatingConfigUpdate {
                        opacity: Some(opacity),
                        ..Default::default()
                    };
                    let _ = db_floating::update_config(&conn, &existing.id, &updates);
                }
                _ => {}
            }
            Ok(())
        });
    }

    Ok(SuccessResponse::ok())
}

/// 检查悬浮窗是否存在
#[tauri::command]
pub fn floating_exists(
    app: AppHandle,
    label: String,
) -> CommandResult<bool> {
    let exists = floating::floating_window_exists(&app, &label);
    Ok(exists)
}

/// 获取窗口位置
#[tauri::command]
pub fn get_floating_position(
    app: AppHandle,
    label: String,
) -> CommandResult<(f64, f64)> {
    let pos = floating::get_window_position(&app, &label)?;
    Ok(pos)
}

/// 从数据库获取悬浮窗配置
#[tauri::command]
pub fn get_floating_config_from_db(
    db: State<DbState>,
    note_id: String,
) -> CommandResult<Option<db_floating::FloatingConfig>> {
    let conn = db.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let config = db_floating::get_config_by_note_id(&conn, &note_id)
        .map_err(|e| format!("查询数据库失败: {}", e))?;

    Ok(config)
}

/// 保存悬浮窗配置到数据库
#[tauri::command]
pub fn save_floating_config(
    db: State<DbState>,
    note_id: String,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    opacity: f64,
    is_penetrable: bool,
    is_collapsed: bool,
) -> CommandResult<SuccessResponse> {
    let conn = db.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    // 检查是否已存在
    match db_floating::get_config_by_note_id(&conn, &note_id) {
        Ok(None) => {
            db_floating::create_config(
                &conn,
                &note_id,
                &label,
                x,
                y,
                width,
                height,
                opacity,
            ).map_err(|e| format!("创建配置失败: {}", e))?;
        }
        Ok(Some(existing)) => {
            let updates = db_floating::FloatingConfigUpdate {
                x: Some(x),
                y: Some(y),
                width: Some(width),
                height: Some(height),
                opacity: Some(opacity),
                is_penetrable: Some(is_penetrable),
                is_collapsed: Some(is_collapsed),
            };
            db_floating::update_config(&conn, &existing.id, &updates)
                .map_err(|e| format!("更新配置失败: {}", e))?;
        }
        Err(e) => return Err(format!("查询配置失败: {}", e)),
    }

    Ok(SuccessResponse::ok())
}

/// 关闭所有悬浮窗
#[tauri::command]
pub fn close_all_floating_windows(
    app: AppHandle,
    state: State<FloatingState>,
) -> CommandResult<Vec<String>> {
    let floating_windows: Vec<(String, Option<String>)> = app
        .webview_windows()
        .into_iter()
        .filter(|(label, _)| label.starts_with("floating-"))
        .map(|(label, _)| {
            let note_id = label.strip_prefix("floating-").map(|id| id.to_string());
            (label, note_id)
        })
        .collect();

    println!(
        "[close_all_floating_windows] 找到 {} 个真实悬浮窗: {:?}",
        floating_windows.len(),
        floating_windows
    );

    for (label, _) in &floating_windows {
        println!("[close_all_floating_windows] 尝试关闭: {}", label);
        if let Some(window) = app.get_webview_window(label) {
            match window.close() {
                Ok(_) => println!("[close_all_floating_windows] 窗口 {} 关闭成功", label),
                Err(e) => println!("[close_all_floating_windows] 窗口 {} 关闭失败: {:?}", label, e),
            }
        }
    }

    if let Ok(mut windows) = state.windows.lock() {
        windows.retain(|label, _| !label.starts_with("floating-"));
        println!("[close_all_floating_windows] 已同步清理 FloatingState");
    }

    let note_ids: Vec<String> = floating_windows
        .into_iter()
        .filter_map(|(_, note_id)| note_id)
        .collect();
    println!("[close_all_floating_windows] 返回被关闭的 noteIds: {:?}", note_ids);
    Ok(note_ids)
}

/// 贴边收起悬浮窗（通过设置窗口位置和大小实现）
#[tauri::command]
pub fn dock_floating_window(
    app: AppHandle,
    label: String,
    dock_side: String, // 只支持 "left"
    window_height: f64,
    window_y: f64, // 原始 Y 位置
) -> CommandResult<SuccessResponse> {
    let window = app.get_webview_window(&label)
        .ok_or_else(|| format!("窗口 {} 不存在", label))?;

    // 只支持左侧贴边
    if dock_side != "left" {
        return Err("无效的 dock_side，只支持 left".to_string());
    }

    // 使用 LogicalPosition/LogicalSize，保持一致性
    // 设置窗口位置和大小，保持原始 y 位置
    window.set_position(tauri::LogicalPosition::new(0.0, window_y))
        .map_err(|e| format!("设置窗口位置失败: {}", e))?;
    window.set_size(tauri::LogicalSize::new(10.0, window_height))
        .map_err(|e| format!("设置窗口大小失败: {}", e))?;

    Ok(SuccessResponse::ok())
}

/// 取消贴边，恢复悬浮窗
#[tauri::command]
pub fn undock_floating_window(
    app: AppHandle,
    state: State<FloatingState>,
    label: String,
    original_x: f64,
    original_y: f64,
    original_width: f64,
    original_height: f64,
) -> CommandResult<SuccessResponse> {
    let window = app.get_webview_window(&label)
        .ok_or_else(|| format!("窗口 {} 不存在", label))?;

    // 恢复窗口位置和大小
    window.set_position(tauri::LogicalPosition::new(original_x, original_y))
        .map_err(|e| format!("设置窗口位置失败: {}", e))?;
    window.set_size(tauri::LogicalSize::new(original_width, original_height))
        .map_err(|e| format!("设置窗口大小失败: {}", e))?;

    // 更新状态
    if let Ok(mut windows) = state.windows.lock() {
        if let Some(config) = windows.get_mut(&label) {
            config.x = Some(original_x);
            config.y = Some(original_y);
            config.width = original_width;
            config.height = original_height;
        }
    }

    Ok(SuccessResponse::ok())
}

// ============================================================
// 主窗口管理命令（便捷封装）
// ============================================================

/// 切换主窗口显示状态
#[tauri::command]
pub fn toggle_main_window(app: AppHandle) -> CommandResult<SuccessResponse> {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            window.hide()
                .map_err(|e| format!("隐藏主窗口失败: {}", e))?;
        } else {
            window.show()
                .map_err(|e| format!("显示主窗口失败: {}", e))?;
            window.set_focus()
                .map_err(|e| format!("聚焦主窗口失败: {}", e))?;
        }
        Ok(SuccessResponse::ok())
    } else {
        Err("主窗口不存在".to_string())
    }
}

/// 设置窗口置顶状态
#[tauri::command]
pub fn set_window_always_on_top(
    app: AppHandle,
    label: String,
    always_on_top: bool,
) -> CommandResult<SuccessResponse> {
    let window = app.get_webview_window(&label)
        .ok_or_else(|| format!("窗口 {} 不存在", label))?;

    window.set_always_on_top(always_on_top)
        .map_err(|e| format!("设置置顶状态失败: {}", e))?;

    Ok(SuccessResponse::ok())
}

// ============================================================
// 悬浮窗便捷命令
// ============================================================

/// 创建悬浮笔记窗口（便捷封装）
#[tauri::command]
pub fn create_floating_note(
    app: AppHandle,
    state: State<FloatingState>,
    db: State<DbState>,
    note_id: String,
    x: Option<f64>,
    y: Option<f64>,
    width: Option<f64>,
    height: Option<f64>,
) -> CommandResult<SuccessResponse> {
    let label = format!("floating-{}", note_id);

    // 如果窗口已存在，先关闭
    if floating::floating_window_exists(&app, &label) {
        floating::close_floating_window(&app, &label)?;
    }

    let config = FloatingConfig {
        label,
        note_id: Some(note_id.clone()),
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
        security_level: None,
        is_incognito: None,
    };

    floating::create_floating_window(&app, config)?;

    // 保存到数据库
    let _ = db.pool.get().and_then(|conn| {
        match db_floating::get_config_by_note_id(&conn, &note_id) {
            Ok(None) => {
                let _ = db_floating::create_config(
                    &conn,
                    &note_id,
                    &format!("floating-{}", note_id),
                    x.unwrap_or(100.0),
                    y.unwrap_or(100.0),
                    width.unwrap_or(320.0),
                    height.unwrap_or(400.0),
                    1.0,
                );
            }
            Ok(Some(existing)) => {
                let updates = db_floating::FloatingConfigUpdate {
                    x,
                    y,
                    width: Some(width.unwrap_or(320.0)),
                    height: Some(height.unwrap_or(400.0)),
                    ..Default::default()
                };
                let _ = db_floating::update_config(&conn, &existing.id, &updates);
            }
            _ => {}
        }
        Ok(())
    });

    Ok(SuccessResponse::ok())
}

/// 更新悬浮窗位置
#[tauri::command]
pub fn update_floating_position(
    app: AppHandle,
    state: State<FloatingState>,
    label: String,
    x: f64,
    y: f64,
) -> CommandResult<SuccessResponse> {
    let window = app.get_webview_window(&label)
        .ok_or_else(|| format!("窗口 {} 不存在", label))?;

    window.set_position(tauri::LogicalPosition::new(x, y))
        .map_err(|e| format!("设置窗口位置失败: {}", e))?;

    // 更新状态
    if let Ok(mut windows) = state.windows.lock() {
        if let Some(config) = windows.get_mut(&label) {
            config.x = Some(x);
            config.y = Some(y);
        }
    }

    Ok(SuccessResponse::ok())
}

/// 切换悬浮窗置顶状态
#[tauri::command]
pub fn toggle_floating_always_on_top(
    app: AppHandle,
    state: State<FloatingState>,
    label: String,
) -> CommandResult<bool> {
    let window = app.get_webview_window(&label)
        .ok_or_else(|| format!("窗口 {} 不存在", label))?;

    // 获取当前状态并取反
    let current_state = if let Ok(mut windows) = state.windows.lock() {
        windows.get(&label).and_then(|c| c.always_on_top).unwrap_or(true)
    } else {
        true
    };

    let new_state = !current_state;

    window.set_always_on_top(new_state)
        .map_err(|e| format!("设置置顶状态失败: {}", e))?;

    // 更新状态
    if let Ok(mut windows) = state.windows.lock() {
        if let Some(config) = windows.get_mut(&label) {
            config.always_on_top = Some(new_state);
        }
    }

    Ok(new_state)
}

/// 获取悬浮窗配置
#[tauri::command]
pub fn get_floating_config(
    app: AppHandle,
    state: State<FloatingState>,
    label: String,
) -> CommandResult<Option<FloatingConfig>> {
    if let Ok(windows) = state.windows.lock() {
        Ok(windows.get(&label).cloned())
    } else {
        Err("获取窗口状态失败".to_string())
    }
}

// ============================================================
// 浮窗安全命令
// ============================================================

/// 锁定浮窗
#[tauri::command]
pub fn lock_floating(
    app: AppHandle,
    label: String,
) -> CommandResult<SuccessResponse> {
    floating::lock_floating(&app, &label)?;
    Ok(SuccessResponse::ok())
}

/// 解锁浮窗（验证密码）
#[tauri::command]
pub fn unlock_floating(
    app: AppHandle,
    label: String,
    password: String,
) -> CommandResult<bool> {
    let result = floating::unlock_floating(&app, &label, &password)?;
    Ok(result)
}

/// 设置浮窗密码
#[tauri::command]
pub fn set_floating_password(
    app: AppHandle,
    label: String,
    password: String,
) -> CommandResult<SuccessResponse> {
    floating::set_floating_password(&app, &label, &password)?;
    Ok(SuccessResponse::ok())
}

/// 清除浮窗密码
#[tauri::command]
pub fn clear_floating_password(
    app: AppHandle,
    label: String,
) -> CommandResult<SuccessResponse> {
    floating::clear_floating_password(&app, &label)?;
    Ok(SuccessResponse::ok())
}

/// 检查浮窗是否已锁定
#[tauri::command]
pub fn is_floating_locked(
    app: AppHandle,
    label: String,
) -> CommandResult<bool> {
    let result = floating::is_floating_locked(&app, &label)?;
    Ok(result)
}

/// 获取浮窗安全状态
#[tauri::command]
pub fn get_floating_security_state(
    app: AppHandle,
    label: String,
) -> CommandResult<floating::FloatingSecurityState> {
    let result = floating::get_floating_security_state(&app, &label)?;
    Ok(result)
}

/// 设置浮窗安全层级
#[tauri::command]
pub fn set_floating_security_level(
    app: AppHandle,
    label: String,
    level: i32,
) -> CommandResult<SuccessResponse> {
    let security_level = match level {
        0 => FloatingSecurityLevel::Normal,
        1 => FloatingSecurityLevel::Protected,
        2 => FloatingSecurityLevel::HighSecurity,
        _ => return Err("无效的安全层级".to_string()),
    };
    floating::set_floating_security_level(&app, &label, security_level)?;
    Ok(SuccessResponse::ok())
}

// ============================================================
// 无痕模式命令
// ============================================================

/// 创建无痕浮窗
#[tauri::command]
pub fn create_incognito_floating(
    app: AppHandle,
    state: State<FloatingState>,
    note_id: String,
    x: Option<f64>,
    y: Option<f64>,
    width: Option<f64>,
    height: Option<f64>,
) -> CommandResult<String> {
    let label = floating::create_incognito_floating(&app, &note_id, x, y, width, height)?;
    Ok(label)
}

/// 关闭无痕浮窗（不保存数据，直接销毁）
#[tauri::command]
pub fn close_incognito_floating(
    app: AppHandle,
    label: String,
) -> CommandResult<SuccessResponse> {
    floating::close_incognito_floating(&app, &label)?;
    Ok(SuccessResponse::ok())
}

/// 销毁所有无痕浮窗
#[tauri::command]
pub fn destroy_all_incognito_floating(
    app: AppHandle,
) -> CommandResult<SuccessResponse> {
    floating::destroy_all_incognito_floating(&app)?;
    Ok(SuccessResponse::ok())
}

/// 检查无痕模式是否开启
#[tauri::command]
pub fn is_incognito_mode(
    app: AppHandle,
) -> CommandResult<bool> {
    let result = floating::is_incognito_mode(&app);
    Ok(result)
}

/// 检查窗口是否为无痕模式
#[tauri::command]
pub fn is_window_incognito(
    app: AppHandle,
    label: String,
) -> CommandResult<bool> {
    let result = floating::is_window_incognito(&app, &label)?;
    Ok(result)
}

// ============================================================
// 安全策略命令
// ============================================================

/// 防止屏幕捕获
#[tauri::command]
pub fn prevent_screen_capture(
    app: AppHandle,
    label: String,
    enabled: bool,
) -> CommandResult<SuccessResponse> {
    security::prevent_screen_capture(&app, &label, enabled)?;
    Ok(SuccessResponse::ok())
}

/// 检查屏幕捕获是否被阻止
#[tauri::command]
pub fn is_screen_capture_prevented() -> CommandResult<bool> {
    let result = security::is_screen_capture_prevented();
    Ok(result)
}

/// 检测调试器
#[tauri::command]
pub fn detect_debugger() -> CommandResult<bool> {
    let result = security::detect_debugger();
    Ok(result)
}

/// 获取安全状态
#[tauri::command]
pub fn get_security_status(
    app: AppHandle,
) -> CommandResult<security::SecurityState> {
    let result = security::get_security_status(&app)?;
    Ok(result)
}

/// 主窗口关闭时的安全检查
#[tauri::command]
pub fn check_main_window_close_security(
    app: AppHandle,
) -> CommandResult<bool> {
    let result = security::check_main_window_close_security(&app)?;
    Ok(result)
}
