use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use chrono::Utc;

/// 标签数据模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
}

impl Tag {
    pub fn from_row(row: &rusqlite::Row) -> SqliteResult<Self> {
        Ok(Tag {
            id: row.get("id")?,
            name: row.get("name")?,
            color: row.get("color")?,
            created_at: row.get("created_at")?,
        })
    }
}

/// 创建标签
pub fn create_tag(conn: &Connection, name: &str, color: Option<&str>) -> SqliteResult<Tag> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let color = color.unwrap_or("#007AFF");

    conn.execute(
        "INSERT INTO tags (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, name, color, now],
    )?;

    conn.query_row("SELECT * FROM tags WHERE id = ?1", params![id], Tag::from_row)
}

/// 获取所有标签
pub fn get_tags(conn: &Connection) -> SqliteResult<Vec<Tag>> {
    let mut stmt = conn.prepare("SELECT * FROM tags ORDER BY name ASC")?;
    let tags = stmt.query_map([], Tag::from_row)?.filter_map(|r| r.ok()).collect();
    Ok(tags)
}

/// 更新标签
pub fn update_tag(conn: &Connection, id: &str, name: Option<&str>, color: Option<&str>) -> SqliteResult<Tag> {
    let mut updates = vec![];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(n) = name {
        updates.push(format!("name = ?{}", idx));
        param_values.push(Box::new(n.to_string()));
        idx += 1;
    }
    if let Some(c) = color {
        updates.push(format!("color = ?{}", idx));
        param_values.push(Box::new(c.to_string()));
        idx += 1;
    }

    if !updates.is_empty() {
        let sql = format!("UPDATE tags SET {} WHERE id = ?{}", updates.join(", "), idx);
        param_values.push(Box::new(id.to_string()));
        let refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, refs.as_slice())?;
    }

    conn.query_row("SELECT * FROM tags WHERE id = ?1", params![id], Tag::from_row)
}

/// 删除标签
pub fn delete_tag(conn: &Connection, id: &str) -> SqliteResult<()> {
    conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;
    Ok(())
}

/// 添加笔记-标签关联
pub fn add_note_tag(conn: &Connection, note_id: &str, tag_id: &str) -> SqliteResult<()> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR IGNORE INTO note_tags (id, note_id, tag_id, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, note_id, tag_id, now],
    )?;
    Ok(())
}

/// 移除笔记-标签关联
pub fn remove_note_tag(conn: &Connection, note_id: &str, tag_id: &str) -> SqliteResult<()> {
    conn.execute(
        "DELETE FROM note_tags WHERE note_id = ?1 AND tag_id = ?2",
        params![note_id, tag_id],
    )?;
    Ok(())
}

/// 根据 ID 获取标签
pub fn get_tag_by_id(conn: &Connection, id: &str) -> SqliteResult<Option<Tag>> {
    let result = conn.query_row(
        "SELECT * FROM tags WHERE id = ?1",
        params![id],
        Tag::from_row,
    );
    match result {
        Ok(tag) => Ok(Some(tag)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// 获取标签关联的笔记数量
pub fn get_note_count_by_tag(conn: &Connection, tag_id: &str) -> SqliteResult<i64> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM note_tags WHERE tag_id = ?1",
        params![tag_id],
        |row| row.get(0),
    )?;
    Ok(count)
}

/// 获取笔记的标签列表
pub fn get_note_tags(conn: &Connection, note_id: &str) -> SqliteResult<Vec<Tag>> {
    let mut stmt = conn.prepare(
        "SELECT t.* FROM tags t
         INNER JOIN note_tags nt ON t.id = nt.tag_id
         WHERE nt.note_id = ?1
         ORDER BY t.name ASC"
    )?;
    let tags = stmt.query_map(params![note_id], Tag::from_row)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(tags)
}

/// 按标签获取笔记 ID 列表
pub fn get_note_ids_by_tag(conn: &Connection, tag_id: &str) -> SqliteResult<Vec<String>> {
    let mut stmt = conn.prepare("SELECT note_id FROM note_tags WHERE tag_id = ?1")?;
    let ids: Vec<String> = stmt.query_map(params![tag_id], |row| row.get(0))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(ids)
}
