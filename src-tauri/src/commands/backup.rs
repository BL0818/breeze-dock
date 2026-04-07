use crate::commands::CommandResult;
use crate::db::DbState;
use crate::fs::backup::{ImportResult, ExportData, self};
use crate::crypto::aes::{encrypt_note_content, decrypt_note_content, KEY_SIZE};
use serde::{Deserialize, Serialize};
use tauri::State;

/// 加密备份元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedBackupMeta {
    /// 备份版本号
    pub version: String,
    /// 备份创建时间
    pub created_at: String,
    /// 备份数据中的应用版本
    pub app_version: String,
    /// 是否加密备份
    pub is_encrypted: bool,
    /// 原笔记数量（加密备份时不解密显示）
    pub note_count: i32,
}

/// 加密备份导出数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedExportData {
    /// 备份元数据
    pub meta: EncryptedBackupMeta,
    /// 加密的笔记数据（Base64 编码的 AES-256-GCM 密文）
    pub encrypted_notes: Vec<EncryptedNoteExport>,
    /// 所有分组
    pub groups: Vec<GroupExport>,
    /// 所有设置（非安全敏感设置）
    pub settings: Vec<SettingExport>,
}

/// 加密导出的笔记数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedNoteExport {
    pub id: String,
    pub title: String,       // 加密后的 Base64 字符串
    pub content: String,     // 加密后的 Base64 字符串
    pub group_id: Option<String>,
    pub is_pinned: i32,
    pub is_starred: i32,
    pub is_archived: i32,
    pub is_trashed: i32,
    pub template: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
    pub trashed_at: Option<String>,
}

/// 导出的分组数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupExport {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
}

/// 导出的设置数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingExport {
    pub key: String,
    pub value: String,
}

/// 加密导出所有数据
///
/// 使用用户提供的密码加密所有笔记内容
#[tauri::command]
pub fn export_data_encrypted(
    state: State<DbState>,
    password: String,
) -> CommandResult<String> {
    if password.len() < 6 {
        return Err("密码长度至少需要 6 个字符".to_string());
    }

    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let app_version = env!("CARGO_PKG_VERSION").to_string();
    let created_at = chrono::Utc::now().to_rfc3339();

    // 使用密码派生密钥
    let salt = crate::crypto::generate_salt();
    let salt_bytes = crate::crypto::decode_salt(&salt)
        .map_err(|e| format!("盐值解码失败: {}", e))?;
    let key = crate::crypto::derive_key(&password, &salt_bytes)
        .map_err(|e| format!("密钥派生失败: {}", e))?;

    if key.len() != KEY_SIZE {
        return Err(format!("密钥长度错误: {}", key.len()));
    }

    // 查询所有笔记
    let mut stmt = conn.prepare(
        "SELECT id, title, content, group_id, is_pinned, is_starred, is_archived,
                is_trashed, template, sort_order, created_at, updated_at, trashed_at
         FROM notes ORDER BY sort_order ASC, updated_at DESC"
    ).map_err(|e| format!("准备查询失败: {}", e))?;

    let mut encrypted_notes = Vec::new();
    let mut note_count = 0;

    let note_rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, i32>(4)?,
            row.get::<_, i32>(5)?,
            row.get::<_, i32>(6)?,
            row.get::<_, i32>(7)?,
            row.get::<_, String>(8)?,
            row.get::<_, i32>(9)?,
            row.get::<_, String>(10)?,
            row.get::<_, String>(11)?,
            row.get::<_, Option<String>>(12)?,
        ))
    }).map_err(|e| format!("查询失败: {}", e))?;

    for note_result in note_rows {
        let (id, title, content, group_id, is_pinned, is_starred, is_archived,
             is_trashed, template, sort_order, created_at, updated_at, trashed_at)
            = note_result.map_err(|e| format!("读取笔记失败: {}", e))?;

        // 加密标题和内容
        let encrypted_title = encrypt_note_content(&title, &key)
            .map_err(|e| format!("加密标题失败: {}", e))?;
        let encrypted_content = encrypt_note_content(&content, &key)
            .map_err(|e| format!("加密内容失败: {}", e))?;

        encrypted_notes.push(EncryptedNoteExport {
            id,
            title: encrypted_title,
            content: encrypted_content,
            group_id,
            is_pinned,
            is_starred,
            is_archived,
            is_trashed,
            template,
            sort_order,
            created_at,
            updated_at,
            trashed_at,
        });
        note_count += 1;
    }

    // 导出分组
    let mut groups = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT id, name, parent_id, sort_order, created_at FROM groups ORDER BY sort_order ASC"
    ).map_err(|e| format!("准备分组查询失败: {}", e))?;

    let group_rows = stmt.query_map([], |row| {
        Ok(GroupExport {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            sort_order: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| format!("查询分组失败: {}", e))?;

    for group in group_rows {
        groups.push(group.map_err(|e| format!("读取分组数据失败: {}", e))?);
    }

    // 导出设置（排除敏感设置）
    let mut settings = Vec::new();
    let mut stmt = conn.prepare("SELECT key, value FROM settings")
        .map_err(|e| format!("准备设置查询失败: {}", e))?;

    let setting_rows = stmt.query_map([], |row| {
        Ok(SettingExport {
            key: row.get(0)?,
            value: row.get(1)?,
        })
    }).map_err(|e| format!("查询设置失败: {}", e))?;

    for setting in setting_rows {
        let s = setting.map_err(|e| format!("读取设置数据失败: {}", e))?;
        // 排除敏感设置
        if s.key != "password_hash" && s.key != "encryption_salt_key" {
            settings.push(s);
        }
    }

    let export_data = EncryptedExportData {
        meta: EncryptedBackupMeta {
            version: "1.0".to_string(),
            created_at,
            app_version,
            is_encrypted: true,
            note_count,
        },
        encrypted_notes,
        groups,
        settings,
    };

    let json = serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("序列化数据失败: {}", e))?;

    // 对整个 JSON 再进行一次加密
    let final_ciphertext = encrypt_note_content(&json, &key)
        .map_err(|e| format!("加密备份失败: {}", e))?;

    // 返回格式：Base64(salt:final_ciphertext)
    let result = format!("{}:{}", salt, final_ciphertext);

    Ok(result)
}

/// 解密并导入加密备份
///
/// 验证密码并解密备份数据
#[tauri::command]
pub fn import_data_encrypted(
    state: State<DbState>,
    encrypted_data: String,
    password: String,
    overwrite: bool,
) -> CommandResult<ImportResult> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    // 解析加密数据格式：salt:ciphertext
    let parts: Vec<&str> = encrypted_data.splitn(2, ':').collect();
    if parts.len() != 2 {
        return Err("加密数据格式错误".to_string());
    }

    let salt = parts[0];
    let ciphertext = parts[1];

    // 派生密钥
    let salt_bytes = crate::crypto::decode_salt(salt)
        .map_err(|e| format!("盐值解码失败: {}", e))?;
    let key = crate::crypto::derive_key(&password, &salt_bytes)
        .map_err(|e| format!("密钥派生失败: {}", e))?;

    // 解密备份 JSON
    let json = decrypt_note_content(ciphertext, &key)
        .map_err(|e| format!("解密备份失败，密码可能错误: {}", e))?;

    // 解析导出的数据
    let data: EncryptedExportData = serde_json::from_str(&json)
        .map_err(|e| format!("解析备份数据失败: {}", e))?;

    let mut notes_imported = 0;
    let mut groups_imported = 0;
    let mut settings_imported = 0;
    let mut skipped = 0;

    // 导入分组
    for group in &data.groups {
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM groups WHERE id = ?1",
            rusqlite::params![group.id],
            |row| row.get::<_, i32>(0),
        ).unwrap_or(0) > 0;

        if exists && !overwrite {
            skipped += 1;
            continue;
        }

        if exists {
            conn.execute(
                "UPDATE groups SET name = ?1, parent_id = ?2, sort_order = ?3, created_at = ?4 WHERE id = ?5",
                rusqlite::params![group.name, group.parent_id, group.sort_order, group.created_at, group.id],
            ).map_err(|e| format!("更新分组失败: {}", e))?;
        } else {
            conn.execute(
                "INSERT INTO groups (id, name, parent_id, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![group.id, group.name, group.parent_id, group.sort_order, group.created_at],
            ).map_err(|e| format!("插入分组失败: {}", e))?;
        }
        groups_imported += 1;
    }

    // 解密并导入笔记
    for note in &data.encrypted_notes {
        // 解密标题和内容
        let title = decrypt_note_content(&note.title, &key)
            .map_err(|e| format!("解密笔记标题失败: {}", e))?;
        let content = decrypt_note_content(&note.content, &key)
            .map_err(|e| format!("解密笔记内容失败: {}", e))?;

        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE id = ?1",
            rusqlite::params![note.id],
            |row| row.get::<_, i32>(0),
        ).unwrap_or(0) > 0;

        if exists && !overwrite {
            skipped += 1;
            continue;
        }

        if exists {
            conn.execute(
                "UPDATE notes SET title = ?1, content = ?2, group_id = ?3, is_pinned = ?4,
                 is_starred = ?5, is_archived = ?6, is_trashed = ?7, template = ?8,
                 sort_order = ?9, created_at = ?10, updated_at = ?11, trashed_at = ?12,
                 is_encrypted = 0
                 WHERE id = ?13",
                rusqlite::params![title, content, note.group_id, note.is_pinned,
                    note.is_starred, note.is_archived, note.is_trashed, note.template,
                    note.sort_order, note.created_at, note.updated_at, note.trashed_at, note.id],
            ).map_err(|e| format!("更新笔记失败: {}", e))?;
        } else {
            conn.execute(
                "INSERT INTO notes (id, title, content, group_id, is_pinned, is_starred,
                 is_archived, is_trashed, template, sort_order, created_at, updated_at, trashed_at, is_encrypted)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 0)",
                rusqlite::params![note.id, title, content, note.group_id, note.is_pinned,
                    note.is_starred, note.is_archived, note.is_trashed, note.template,
                    note.sort_order, note.created_at, note.updated_at, note.trashed_at],
            ).map_err(|e| format!("插入笔记失败: {}", e))?;
        }
        notes_imported += 1;
    }

    // 导入设置（排除敏感设置）
    for setting in &data.settings {
        if setting.key != "password_hash" && setting.key != "encryption_salt_key" {
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
                rusqlite::params![setting.key, setting.value],
            ).map_err(|e| format!("导入设置失败: {}", e))?;
            settings_imported += 1;
        }
    }

    Ok(ImportResult {
        notes_imported,
        groups_imported,
        settings_imported,
        skipped,
    })
}

/// 导出所有数据为 JSON 字符串（明文）
#[tauri::command]
pub fn export_data(
    state: State<DbState>,
) -> CommandResult<String> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let data = backup::export_all_data(&conn)?;
    let json = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("序列化数据失败: {}", e))?;
    Ok(json)
}

/// 导出数据到指定文件路径
#[tauri::command]
pub fn export_to_file(
    state: State<DbState>,
    path: String,
) -> CommandResult<String> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let data = backup::export_all_data(&conn)?;
    backup::save_backup_to_file(&data, &path)?;
    Ok(path)
}

/// 从 JSON 字符串导入数据
#[tauri::command]
pub fn import_data(
    state: State<DbState>,
    json: String,
    overwrite: Option<bool>,
) -> CommandResult<ImportResult> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let data: backup::ExportData = serde_json::from_str(&json)
        .map_err(|e| format!("解析导入数据失败: {}", e))?;
    let result = backup::import_data(&conn, &data, overwrite.unwrap_or(false))?;
    Ok(result)
}

/// 从文件导入数据
#[tauri::command]
pub fn import_from_file(
    state: State<DbState>,
    path: String,
    overwrite: Option<bool>,
) -> CommandResult<ImportResult> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let data = backup::load_backup_from_file(&path)?;
    let result = backup::import_data(&conn, &data, overwrite.unwrap_or(false))?;
    Ok(result)
}
