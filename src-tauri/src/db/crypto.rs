//! 数据库加密操作模块
//!
//! 提供加密笔记的数据库存储和检索功能

use crate::crypto::aes::{decrypt_note_content, encrypt_note_content};
use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};

/// 加密笔记数据模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedNote {
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
    pub word_count: i32,
    pub created_at: String,
    pub updated_at: String,
    pub trashed_at: Option<String>,
    pub is_encrypted: i32,   // 标记是否为加密笔记
}

/// 检查笔记是否为加密状态
pub fn is_note_encrypted(conn: &Connection, note_id: &str) -> SqliteResult<bool> {
    let result = conn.query_row(
        "SELECT is_encrypted FROM notes WHERE id = ?1",
        params![note_id],
        |row| row.get::<_, i32>(0),
    );
    match result {
        Ok(is_encrypted) => Ok(is_encrypted == 1),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(false),
        Err(e) => Err(e),
    }
}

/// 获取加密笔记（不解密）
pub fn get_encrypted_note(conn: &Connection, id: &str) -> SqliteResult<Option<EncryptedNote>> {
    let result = conn.query_row(
        "SELECT id, title, content, group_id, is_pinned, is_starred, is_archived,
                is_trashed, template, sort_order, word_count, created_at, updated_at,
                trashed_at, is_encrypted
         FROM notes WHERE id = ?1",
        params![id],
        |row| {
            Ok(EncryptedNote {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                group_id: row.get(3)?,
                is_pinned: row.get(4)?,
                is_starred: row.get(5)?,
                is_archived: row.get(6)?,
                is_trashed: row.get(7)?,
                template: row.get(8)?,
                sort_order: row.get(9)?,
                word_count: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
                trashed_at: row.get(13)?,
                is_encrypted: row.get(14)?,
            })
        },
    );
    match result {
        Ok(note) => Ok(Some(note)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// 解密并获取笔记
///
/// # 参数
/// - `conn`: 数据库连接
/// - `id`: 笔记 ID
/// - `key`: 32 字节加密密钥
///
/// # 返回
/// 解密后的 (标题, 内容) 元组
pub fn decrypt_and_get_note(conn: &Connection, id: &str, key: &[u8]) -> Result<(String, String), String> {
    let note = get_encrypted_note(conn, id)
        .map_err(|e| format!("查询笔记失败: {}", e))?
        .ok_or_else(|| "笔记不存在".to_string())?;

    if note.is_encrypted == 0 {
        // 未加密笔记，直接返回原文
        return Ok((note.title, note.content));
    }

    // 解密标题和内容
    let title = decrypt_note_content(&note.title, key)
        .map_err(|e| format!("解密标题失败: {}", e))?;
    let content = decrypt_note_content(&note.content, key)
        .map_err(|e| format!("解密内容失败: {}", e))?;

    Ok((title, content))
}

/// 加密笔记并保存到数据库
///
/// # 参数
/// - `conn`: 数据库连接
/// - `id`: 笔记 ID
/// - `title`: 明文标题
/// - `content`: 明文内容
/// - `key`: 32 字节加密密钥
pub fn encrypt_and_save_note(
    conn: &Connection,
    id: &str,
    title: &str,
    content: &str,
    key: &[u8],
) -> Result<(), String> {
    let encrypted_title = encrypt_note_content(title, key)
        .map_err(|e| format!("加密标题失败: {}", e))?;
    let encrypted_content = encrypt_note_content(content, key)
        .map_err(|e| format!("加密内容失败: {}", e))?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE notes SET title = ?1, content = ?2, is_encrypted = 1, updated_at = ?3 WHERE id = ?4",
        params![encrypted_title, encrypted_content, now, id],
    ).map_err(|e| format!("更新加密笔记失败: {}", e))?;

    Ok(())
}

/// 解密笔记并保存到数据库
///
/// # 参数
/// - `conn`: 数据库连接
/// - `id`: 笔记 ID
/// - `key`: 32 字节加密密钥
pub fn decrypt_and_save_note(
    conn: &Connection,
    id: &str,
    key: &[u8],
) -> Result<(String, String), String> {
    let note = get_encrypted_note(conn, id)
        .map_err(|e| format!("查询笔记失败: {}", e))?
        .ok_or_else(|| "笔记不存在".to_string())?;

    if note.is_encrypted == 0 {
        return Ok((note.title, note.content));
    }

    let title = decrypt_note_content(&note.title, key)
        .map_err(|e| format!("解密标题失败: {}", e))?;
    let content = decrypt_note_content(&note.content, key)
        .map_err(|e| format!("解密内容失败: {}", e))?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE notes SET title = ?1, content = ?2, is_encrypted = 0, updated_at = ?3 WHERE id = ?4",
        params![title, content, now, id],
    ).map_err(|e| format!("更新解密笔记失败: {}", e))?;

    Ok((title, content))
}

/// 批量加密数据库中的所有未加密笔记
///
/// # 参数
/// - `conn`: 数据库连接
/// - `key`: 32 字节加密密钥
///
/// # 返回
/// 成功加密的笔记数量
pub fn encrypt_all_notes(conn: &Connection, key: &[u8]) -> Result<i32, String> {
    let mut stmt = conn.prepare(
        "SELECT id, title, content FROM notes WHERE is_encrypted = 0"
    ).map_err(|e| format!("准备查询失败: {}", e))?;

    let mut count = 0;
    let mut rows = stmt.query([]).map_err(|e| format!("查询失败: {}", e))?;

    while let Some(row) = rows.next().map_err(|e| format!("遍历行失败: {}", e))? {
        let id: String = row.get(0).map_err(|e| format!("获取 ID 失败: {}", e))?;
        let title: String = row.get(1).map_err(|e| format!("获取标题失败: {}", e))?;
        let content: String = row.get(2).map_err(|e| format!("获取内容失败: {}", e))?;

        encrypt_and_save_note(conn, &id, &title, &content, key)?;
        count += 1;
    }

    Ok(count)
}

/// 批量解密数据库中的所有加密笔记
///
/// # 参数
/// - `conn`: 数据库连接
/// - `key`: 32 字节加密密钥
///
/// # 返回
/// 成功解密的笔记数量
pub fn decrypt_all_notes(conn: &Connection, key: &[u8]) -> Result<i32, String> {
    let mut stmt = conn.prepare(
        "SELECT id FROM notes WHERE is_encrypted = 1"
    ).map_err(|e| format!("准备查询失败: {}", e))?;

    let mut count = 0;
    let mut rows = stmt.query([]).map_err(|e| format!("查询失败: {}", e))?;

    while let Some(row) = rows.next().map_err(|e| format!("遍历行失败: {}", e))? {
        let id: String = row.get(0).map_err(|e| format!("获取 ID 失败: {}", e))?;
        decrypt_and_save_note(conn, &id, key)?;
        count += 1;
    }

    Ok(count)
}

/// 将 notes 表添加 is_encrypted 列（如果不存在）
pub fn add_is_encrypted_column(conn: &Connection) -> SqliteResult<()> {
    // 检查列是否存在
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('notes') WHERE name = 'is_encrypted'",
        [],
        |row| row.get(0),
    )?;

    if count == 0 {
        conn.execute(
            "ALTER TABLE notes ADD COLUMN is_encrypted INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    Ok(())
}

/// 获取加密笔记的总数
pub fn get_encrypted_note_count(conn: &Connection) -> SqliteResult<i32> {
    conn.query_row(
        "SELECT COUNT(*) FROM notes WHERE is_encrypted = 1",
        [],
        |row| row.get(0),
    )
}

/// 获取未加密笔记的总数
pub fn get_unencrypted_note_count(conn: &Connection) -> SqliteResult<i32> {
    conn.query_row(
        "SELECT COUNT(*) FROM notes WHERE is_encrypted = 0",
        [],
        |row| row.get(0),
    )
}
