use crate::commands::CommandResult;
use crate::db::DbState;
use serde::{Deserialize, Serialize};
use tauri::State;

/// 设置项键值对
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingItem {
    pub key: String,
    pub value: String,
}

/// 获取单个设置项
#[tauri::command]
pub fn get_setting(
    state: State<DbState>,
    key: String,
) -> CommandResult<Option<String>> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get::<_, String>(0),
    );

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("查询设置失败: {}", e)),
    }
}

/// 设置单个配置项（不存在则创建，存在则更新）
#[tauri::command]
pub fn set_setting(
    state: State<DbState>,
    key: String,
    value: String,
) -> CommandResult<()> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![key, value],
    ).map_err(|e| format!("保存设置失败: {}", e))?;

    Ok(())
}

/// 获取所有设置项
#[tauri::command]
pub fn get_all_settings(
    state: State<DbState>,
) -> CommandResult<Vec<SettingItem>> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let mut stmt = conn.prepare("SELECT key, value FROM settings")
        .map_err(|e| format!("准备查询失败: {}", e))?;

    let settings = stmt.query_map([], |row| {
        Ok(SettingItem {
            key: row.get(0)?,
            value: row.get(1)?,
        })
    }).map_err(|e| format!("查询设置失败: {}", e))?
    .filter_map(|r| r.ok())
    .collect();

    Ok(settings)
}

/// 启用开机自启动
#[tauri::command]
pub fn autostart_enable(app: tauri::AppHandle) -> CommandResult<()> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart_manager = app.autolaunch();
    autostart_manager.enable()
        .map_err(|e| format!("启用开机自启动失败: {}", e))?;

    Ok(())
}

/// 禁用开机自启动
#[tauri::command]
pub fn autostart_disable(app: tauri::AppHandle) -> CommandResult<()> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart_manager = app.autolaunch();
    autostart_manager.disable()
        .map_err(|e| format!("禁用开机自启动失败: {}", e))?;

    Ok(())
}

/// 获取开机自启动状态
#[tauri::command]
pub fn autostart_status(app: tauri::AppHandle) -> CommandResult<bool> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart_manager = app.autolaunch();
    let is_enabled = autostart_manager.is_enabled()
        .map_err(|e| format!("获取开机自启动状态失败: {}", e))?;

    Ok(is_enabled)
}
