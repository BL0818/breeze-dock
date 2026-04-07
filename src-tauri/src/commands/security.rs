//! 安全与隐私命令模块
//!
//! 提供密码设置、验证、锁屏、隐身模式等安全相关命令

use crate::commands::CommandResult;
use crate::crypto::{decode_salt, derive_key, hash_password, verify_password};
use crate::db::DbState;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use tauri::State;

/// 安全设置键名
const KEY_ENCRYPTION_ENABLED: &str = "encryption_enabled";
const KEY_PASSWORD_HASH: &str = "password_hash";
const KEY_INCOGNITO_MODE: &str = "incognito_mode";
const KEY_LAST_LOCK_TIME: &str = "last_lock_time";

/// 检查是否已设置密码
fn has_password_set(conn: &rusqlite::Connection) -> Result<bool, String> {
    let hash = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![KEY_PASSWORD_HASH],
        |row| row.get::<_, String>(0),
    );

    Ok(hash.is_ok())
}

/// 获取当前密码哈希
fn get_password_hash(conn: &rusqlite::Connection) -> Result<Option<String>, String> {
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![KEY_PASSWORD_HASH],
        |row| row.get::<_, String>(0),
    );

    match result {
        Ok(hash) => Ok(Some(hash)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("查询密码哈希失败: {}", e)),
    }
}

/// 保存密码哈希到设置
fn save_password_hash(conn: &rusqlite::Connection, hash: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![KEY_PASSWORD_HASH, hash],
    ).map_err(|e| format!("保存密码哈希失败: {}", e))?;
    Ok(())
}

/// 保存设置值
fn save_setting(conn: &rusqlite::Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![key, value],
    ).map_err(|e| format!("保存设置失败: {}", e))?;
    Ok(())
}

/// 获取设置值
fn get_setting(conn: &rusqlite::Connection, key: &str) -> Result<Option<String>, String> {
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

/// 设置应用密码
///
/// 使用 Argon2id 哈希密码并存储
#[tauri::command]
pub fn set_password(
    state: State<DbState>,
    password: String,
) -> CommandResult<()> {
    if password.len() < 6 {
        return Err("密码长度至少需要 6 个字符".to_string());
    }

    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    // 哈希密码
    let hash = hash_password(&password)
        .map_err(|e| format!("密码哈希失败: {}", e))?;

    // 保存哈希
    save_password_hash(&conn, &hash)?;

    // 启用加密
    save_setting(&conn, KEY_ENCRYPTION_ENABLED, "true")?;

    // 派生密钥并存储到内存
    let salt = crate::crypto::generate_salt();
    let key = derive_key(&password, &decode_salt(&salt).map_err(|e| format!("盐值解码失败: {}", e))?)
        .map_err(|e| format!("密钥派生失败: {}", e))?;

    // 将盐值和密钥一起存储
    let salt_key = format!("{}:{}", salt, BASE64.encode(&key));
    save_setting(&conn, "encryption_salt_key", &salt_key)?;

    // 更新内存中的密钥
    let mut encryption_key = state.encryption_key.lock()
        .map_err(|e| format!("锁定密钥失败: {}", e))?;
    *encryption_key = Some(key);

    Ok(())
}

/// 验证应用密码
///
/// 验证成功后会将密钥加载到内存中
#[tauri::command]
pub fn verify_password_cmd(
    state: State<DbState>,
    password: String,
) -> CommandResult<bool> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let hash = match get_password_hash(&conn)? {
        Some(h) => h,
        None => return Ok(false),
    };

    // 验证密码
    let valid = verify_password(&password, &hash)
        .map_err(|e| format!("密码验证失败: {}", e))?;

    if valid {
        // 验证成功，加载密钥到内存
        let salt_key = get_setting(&conn, "encryption_salt_key")?
            .ok_or_else(|| "未找到加密盐值".to_string())?;

        let parts: Vec<&str> = salt_key.split(':').collect();
        if parts.len() != 2 {
            return Err("加密盐值格式错误".to_string());
        }

        let salt = parts[0];
        let key_b64 = parts[1];

        let key = BASE64.decode(key_b64)
            .map_err(|e| format!("密钥解码失败: {}", e))?;

        let mut encryption_key = state.encryption_key.lock()
            .map_err(|e| format!("锁定密钥失败: {}", e))?;
        *encryption_key = Some(key);
    }

    Ok(valid)
}

/// 移除应用密码
///
/// 需要先验证当前密码
#[tauri::command]
pub fn remove_password(
    state: State<DbState>,
    current_password: String,
) -> CommandResult<()> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    // 验证当前密码
    let hash = get_password_hash(&conn)?
        .ok_or_else(|| "未设置密码".to_string())?;

    let valid = verify_password(&current_password, &hash)
        .map_err(|e| format!("密码验证失败: {}", e))?;

    if !valid {
        return Err("密码错误".to_string());
    }

    // 先解密所有笔记
    let key = {
        let encryption_key = state.encryption_key.lock()
            .map_err(|e| format!("锁定密钥失败: {}", e))?;
        encryption_key.clone()
    };

    if let Some(key) = key {
        // 解密所有笔记
        if let Err(e) = crate::db::crypto::decrypt_all_notes(&conn, &key) {
            return Err(format!("解密笔记失败: {}", e));
        }
    }

    // 清除密码相关设置
    conn.execute(
        "DELETE FROM settings WHERE key IN (?1, ?2, ?3)",
        rusqlite::params![KEY_PASSWORD_HASH, KEY_ENCRYPTION_ENABLED, "encryption_salt_key"],
    ).map_err(|e| format!("删除密码设置失败: {}", e))?;

    // 清除内存中的密钥
    let mut encryption_key = state.encryption_key.lock()
        .map_err(|e| format!("锁定密钥失败: {}", e))?;
    *encryption_key = None;

    Ok(())
}

/// 启用或禁用隐身模式
#[tauri::command]
pub fn enable_incognito(
    state: State<DbState>,
    enabled: bool,
) -> CommandResult<()> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    save_setting(&conn, KEY_INCOGNITO_MODE, if enabled { "true" } else { "false" })?;

    // 如果启用隐身模式且有密钥，清除内存密钥
    if enabled {
        let mut encryption_key = state.encryption_key.lock()
            .map_err(|e| format!("锁定密钥失败: {}", e))?;
        *encryption_key = None;
    }

    Ok(())
}

/// 检查是否处于隐身模式
#[tauri::command]
pub fn is_incognito(
    state: State<DbState>,
) -> CommandResult<bool> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let value = get_setting(&conn, KEY_INCOGNITO_MODE)?
        .unwrap_or_else(|| "false".to_string());

    Ok(value == "true")
}

/// 锁定应用
///
/// 清除内存中的密钥
#[tauri::command]
pub fn lock_app(
    state: State<DbState>,
) -> CommandResult<()> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    // 更新最后锁定时间
    let now = Utc::now().to_rfc3339();
    save_setting(&conn, KEY_LAST_LOCK_TIME, &now)?;

    // 清除内存中的密钥
    let mut encryption_key = state.encryption_key.lock()
        .map_err(|e| format!("锁定密钥失败: {}", e))?;
    *encryption_key = None;

    Ok(())
}

/// 检查是否已设置密码
#[tauri::command]
pub fn is_password_set(
    state: State<DbState>,
) -> CommandResult<bool> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    has_password_set(&conn)
}

/// 检查加密是否启用
#[tauri::command]
pub fn is_encryption_enabled(
    state: State<DbState>,
) -> CommandResult<bool> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let value = get_setting(&conn, KEY_ENCRYPTION_ENABLED)?
        .unwrap_or_else(|| "false".to_string());

    Ok(value == "true")
}

/// 检查应用是否已锁定（内存中是否有密钥）
#[tauri::command]
pub fn is_app_locked(
    state: State<DbState>,
) -> CommandResult<bool> {
    let encryption_key = state.encryption_key.lock()
        .map_err(|e| format!("锁定密钥失败: {}", e))?;

    Ok(encryption_key.is_none())
}

/// 获取加密笔记数量统计
#[tauri::command]
pub fn get_encryption_stats(
    state: State<DbState>,
) -> CommandResult<EncryptionStats> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let encrypted_count = crate::db::crypto::get_encrypted_note_count(&conn)
        .map_err(|e| format!("查询加密笔记数失败: {}", e))?;
    let unencrypted_count = crate::db::crypto::get_unencrypted_note_count(&conn)
        .map_err(|e| format!("查询未加密笔记数失败: {}", e))?;
    let password_is_set = has_password_set(&conn)?;

    Ok(EncryptionStats {
        encrypted_count,
        unencrypted_count,
        password_is_set,
    })
}

/// 加密统计信息
#[derive(Debug, serde::Serialize)]
pub struct EncryptionStats {
    pub encrypted_count: i32,
    pub unencrypted_count: i32,
    pub password_is_set: bool,
}

/// 解锁应用（从已锁定的状态恢复）
///
/// 需要先通过 verify_password 验证密码
#[tauri::command]
pub fn unlock_app(
    state: State<DbState>,
    password: String,
) -> CommandResult<bool> {
    verify_password_cmd(state, password)
}
