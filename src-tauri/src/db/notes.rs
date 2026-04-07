use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use chrono::Utc;

/// 笔记数据模型 - 对应 notes 表
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
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
}

/// 创建笔记的参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNoteParams {
    pub title: Option<String>,
    pub content: Option<String>,
    pub group_id: Option<String>,
    pub template: Option<String>,
}

/// 更新笔记的参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateNoteParams {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub group_id: Option<String>,
    pub template: Option<String>,
}

/// 笔记历史版本数据模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteHistory {
    pub id: String,
    pub note_id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
}

/// 笔记查询过滤条件
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NoteFilter {
    pub group_id: Option<String>,
    pub is_pinned: Option<i32>,
    pub is_starred: Option<i32>,
    pub is_archived: Option<i32>,
    pub is_trashed: Option<i32>,
    pub keyword: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

/// 从数据库行数据构建 Note 对象
impl Note {
    pub fn from_row(row: &rusqlite::Row) -> SqliteResult<Self> {
        Ok(Note {
            id: row.get("id")?,
            title: row.get("title")?,
            content: row.get("content")?,
            group_id: row.get("group_id")?,
            is_pinned: row.get("is_pinned")?,
            is_starred: row.get("is_starred")?,
            is_archived: row.get("is_archived")?,
            is_trashed: row.get("is_trashed")?,
            template: row.get("template")?,
            sort_order: row.get("sort_order")?,
            word_count: row.get("word_count")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            trashed_at: row.get("trashed_at")?,
        })
    }
}

/// 从数据库行数据构建 NoteHistory 对象
impl NoteHistory {
    pub fn from_row(row: &rusqlite::Row) -> SqliteResult<Self> {
        Ok(NoteHistory {
            id: row.get("id")?,
            note_id: row.get("note_id")?,
            title: row.get("title")?,
            content: row.get("content")?,
            created_at: row.get("created_at")?,
        })
    }
}

/// 创建新笔记
pub fn create_note(conn: &Connection, params: CreateNoteParams) -> SqliteResult<Note> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let title = params.title.unwrap_or_default();
    let content = params.content.unwrap_or_default();
    let group_id = params.group_id;
    let template = params.template.unwrap_or_else(|| "blank".to_string());

    conn.execute(
        "INSERT INTO notes (id, title, content, group_id, template, word_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, title, content, group_id, template, 0, now, now],
    )?;

    // 查询并返回创建的笔记
    let note = conn.query_row(
        "SELECT * FROM notes WHERE id = ?1",
        params![id],
        Note::from_row,
    )?;
    Ok(note)
}

/// 根据 ID 获取笔记
pub fn get_note(conn: &Connection, id: &str) -> SqliteResult<Option<Note>> {
    let result = conn.query_row(
        "SELECT * FROM notes WHERE id = ?1",
        params![id],
        Note::from_row,
    );
    match result {
        Ok(note) => Ok(Some(note)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// 更新笔记内容
/// 更新前自动将旧内容保存到历史记录中
pub fn update_note(conn: &Connection, params: UpdateNoteParams) -> SqliteResult<Note> {
    let now = Utc::now().to_rfc3339();

    // 先获取当前笔记，用于保存历史
    if let Some(current) = get_note(conn, &params.id)? {
        // 只有内容发生变化时才保存历史
        let content_changed = params.content.as_ref().map_or(false, |c| c != &current.content);
        let title_changed = params.title.as_ref().map_or(false, |t| t != &current.title);

        if content_changed || title_changed {
            save_history(conn, &current)?;
        }
    }

    // 构建动态更新语句
    let mut updates = vec!["updated_at = ?1".to_string()];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];

    let mut param_idx = 2;
    if let Some(ref title) = params.title {
        updates.push(format!("title = ?{}", param_idx));
        param_values.push(Box::new(title.clone()));
        param_idx += 1;
    }
    if let Some(ref content) = params.content {
        updates.push(format!("content = ?{}", param_idx));
        param_values.push(Box::new(content.clone()));
        param_idx += 1;
    }
    if let Some(ref group_id) = params.group_id {
        updates.push(format!("group_id = ?{}", param_idx));
        param_values.push(Box::new(group_id.clone()));
        param_idx += 1;
    }
    if let Some(ref template) = params.template {
        updates.push(format!("template = ?{}", param_idx));
        param_values.push(Box::new(template.clone()));
        param_idx += 1;
    }

    let sql = format!(
        "UPDATE notes SET {} WHERE id = ?{}",
        updates.join(", "),
        param_idx
    );
    param_values.push(Box::new(params.id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())?;

    // 返回更新后的笔记
    get_note(conn, &params.id)?.ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)
}

/// 保存笔记历史记录
fn save_history(conn: &Connection, note: &Note) -> SqliteResult<()> {
    let history_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO note_history (id, note_id, title, content, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![history_id, note.id, note.title, note.content, now],
    )?;
    Ok(())
}

/// 将笔记移至回收站
pub fn trash_note(conn: &Connection, id: &str) -> SqliteResult<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE notes SET is_trashed = 1, trashed_at = ?1, updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    Ok(())
}

/// 从回收站恢复笔记
pub fn restore_note(conn: &Connection, id: &str) -> SqliteResult<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE notes SET is_trashed = 0, trashed_at = NULL, updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    Ok(())
}

/// 永久删除笔记（从数据库中移除）
pub fn delete_note_permanent(conn: &Connection, id: &str) -> SqliteResult<()> {
    // 先删除关联的历史记录
    conn.execute("DELETE FROM note_history WHERE note_id = ?1", params![id])?;
    conn.execute("DELETE FROM notes WHERE id = ?1", params![id])?;
    Ok(())
}

/// 查询笔记列表，支持多种过滤条件
pub fn get_notes(conn: &Connection, filter: &NoteFilter) -> SqliteResult<Vec<Note>> {
    let mut sql = String::from("SELECT * FROM notes WHERE 1=1");
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut param_idx = 1;

    // 构建查询条件
    if let Some(ref group_id) = filter.group_id {
        sql.push_str(&format!(" AND group_id = ?{}", param_idx));
        param_values.push(Box::new(group_id.clone()));
        param_idx += 1;
    }
    if let Some(is_pinned) = filter.is_pinned {
        sql.push_str(&format!(" AND is_pinned = ?{}", param_idx));
        param_values.push(Box::new(is_pinned));
        param_idx += 1;
    }
    if let Some(is_starred) = filter.is_starred {
        sql.push_str(&format!(" AND is_starred = ?{}", param_idx));
        param_values.push(Box::new(is_starred));
        param_idx += 1;
    }
    if let Some(is_archived) = filter.is_archived {
        sql.push_str(&format!(" AND is_archived = ?{}", param_idx));
        param_values.push(Box::new(is_archived));
        param_idx += 1;
    }
    if let Some(is_trashed) = filter.is_trashed {
        sql.push_str(&format!(" AND is_trashed = ?{}", param_idx));
        param_values.push(Box::new(is_trashed));
        param_idx += 1;
    }
    if let Some(ref keyword) = filter.keyword {
        sql.push_str(&format!(" AND (title LIKE ?{} OR content LIKE ?{})", param_idx, param_idx));
        param_values.push(Box::new(format!("%{}%", keyword)));
        param_idx += 1;
    }

    // 排序：置顶优先，然后按更新时间降序
    sql.push_str(" ORDER BY is_pinned DESC, sort_order ASC, updated_at DESC");

    // 分页
    if let Some(limit) = filter.limit {
        sql.push_str(&format!(" LIMIT ?{}", param_idx));
        param_values.push(Box::new(limit));
        param_idx += 1;
    }
    if let Some(offset) = filter.offset {
        sql.push_str(&format!(" OFFSET ?{}", param_idx));
        param_values.push(Box::new(offset));
    }

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql)?;
    let notes = stmt.query_map(param_refs.as_slice(), Note::from_row)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(notes)
}

/// 搜索笔记 - 支持标题和内容模糊匹配
pub fn search_notes(conn: &Connection, keyword: &str, limit: Option<i32>) -> SqliteResult<Vec<Note>> {
    let pattern = format!("%{}%", keyword);
    let limit_val = limit.unwrap_or(50);

    let mut stmt = conn.prepare(
        "SELECT * FROM notes
         WHERE is_trashed = 0 AND (title LIKE ?1 OR content LIKE ?1)
         ORDER BY is_pinned DESC, updated_at DESC
         LIMIT ?2"
    )?;

    let notes = stmt.query_map(params![pattern, limit_val], Note::from_row)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(notes)
}

/// 切换笔记置顶状态
pub fn toggle_pin(conn: &Connection, id: &str, pinned: bool) -> SqliteResult<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE notes SET is_pinned = ?1, updated_at = ?2 WHERE id = ?3",
        params![pinned as i32, now, id],
    )?;
    Ok(())
}

/// 切换笔记收藏状态
pub fn toggle_star(conn: &Connection, id: &str, starred: bool) -> SqliteResult<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE notes SET is_starred = ?1, updated_at = ?2 WHERE id = ?3",
        params![starred as i32, now, id],
    )?;
    Ok(())
}

/// 切换笔记归档状态
pub fn toggle_archive(conn: &Connection, id: &str, archived: bool) -> SqliteResult<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE notes SET is_archived = ?1, updated_at = ?2 WHERE id = ?3",
        params![archived as i32, now, id],
    )?;
    Ok(())
}

/// 批量更新笔记排序顺序
pub fn reorder_notes(conn: &Connection, orders: &[(String, i32)]) -> SqliteResult<()> {
    let now = Utc::now().to_rfc3339();
    for (id, sort_order) in orders {
        conn.execute(
            "UPDATE notes SET sort_order = ?1, updated_at = ?2 WHERE id = ?3",
            params![sort_order, now, id],
        )?;
    }
    Ok(())
}

/// 获取笔记的历史版本列表
pub fn get_note_history(conn: &Connection, note_id: &str) -> SqliteResult<Vec<NoteHistory>> {
    let mut stmt = conn.prepare(
        "SELECT * FROM note_history WHERE note_id = ?1 ORDER BY created_at DESC"
    )?;
    let history = stmt.query_map(params![note_id], NoteHistory::from_row)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(history)
}

/// 回滚笔记到指定历史版本
pub fn rollback_note(conn: &Connection, note_id: &str, history_id: &str) -> SqliteResult<Note> {
    let now = Utc::now().to_rfc3339();

    // 获取历史版本内容
    let history = conn.query_row(
        "SELECT * FROM note_history WHERE id = ?1",
        params![history_id],
        NoteHistory::from_row,
    )?;

    // 先保存当前内容到历史
    if let Some(current) = get_note(conn, note_id)? {
        save_history(conn, &current)?;
    }

    // 回滚到历史版本
    conn.execute(
        "UPDATE notes SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
        params![history.title, history.content, now, note_id],
    )?;

    get_note(conn, note_id)?.ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)
}
