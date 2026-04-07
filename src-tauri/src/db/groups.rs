use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use chrono::Utc;

/// 分组数据模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub icon: String,
    pub sort_order: i32,
    pub created_at: String,
}

impl Group {
    pub fn from_row(row: &rusqlite::Row) -> SqliteResult<Self> {
        Ok(Group {
            id: row.get("id")?,
            name: row.get("name")?,
            parent_id: row.get("parent_id")?,
            icon: row.get("icon")?,
            sort_order: row.get("sort_order")?,
            created_at: row.get("created_at")?,
        })
    }
}

/// 创建分组
pub fn create_group(
    conn: &Connection,
    name: &str,
    parent_id: Option<&str>,
    icon: Option<&str>,
) -> SqliteResult<Group> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let icon = icon.unwrap_or("folder");

    // 获取当前最大排序值
    let max_order: i32 = match parent_id {
        Some(pid) => conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM groups WHERE parent_id = ?1",
            params![pid],
            |row| row.get(0),
        ).unwrap_or(-1),
        None => conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM groups WHERE parent_id IS NULL",
            [],
            |row| row.get(0),
        ).unwrap_or(-1),
    };

    conn.execute(
        "INSERT INTO groups (id, name, parent_id, icon, sort_order, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, name, parent_id, icon, max_order + 1, now],
    )?;

    conn.query_row("SELECT * FROM groups WHERE id = ?1", params![id], Group::from_row)
}

/// 获取所有分组
pub fn get_groups(conn: &Connection) -> SqliteResult<Vec<Group>> {
    let mut stmt = conn.prepare(
        "SELECT * FROM groups ORDER BY parent_id NULLS FIRST, sort_order ASC"
    )?;
    let groups = stmt.query_map([], Group::from_row)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(groups)
}

/// 根据 ID 获取分组
pub fn get_group_by_id(conn: &Connection, id: &str) -> SqliteResult<Option<Group>> {
    let result = conn.query_row(
        "SELECT * FROM groups WHERE id = ?1",
        params![id],
        Group::from_row,
    );
    match result {
        Ok(group) => Ok(Some(group)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// 更新分组
pub fn update_group(
    conn: &Connection,
    id: &str,
    name: Option<&str>,
    parent_id: Option<Option<&str>>,
    icon: Option<&str>,
) -> SqliteResult<Group> {
    let mut updates = vec![];
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(n) = name {
        updates.push(format!("name = ?{}", idx));
        param_values.push(Box::new(n.to_string()));
        idx += 1;
    }
    if let Some(pid) = parent_id {
        updates.push(format!("parent_id = ?{}", idx));
        param_values.push(Box::new(pid.map(|s| s.to_string())));
        idx += 1;
    }
    if let Some(i) = icon {
        updates.push(format!("icon = ?{}", idx));
        param_values.push(Box::new(i.to_string()));
        idx += 1;
    }

    if !updates.is_empty() {
        let sql = format!("UPDATE groups SET {} WHERE id = ?{}", updates.join(", "), idx);
        param_values.push(Box::new(id.to_string()));
        let refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, refs.as_slice())?;
    }

    conn.query_row("SELECT * FROM groups WHERE id = ?1", params![id], Group::from_row)
}

/// 删除分组
pub fn delete_group(conn: &Connection, id: &str) -> SqliteResult<()> {
    // 先将该分组下的笔记移出
    conn.execute(
        "UPDATE notes SET group_id = NULL WHERE group_id = ?1",
        params![id],
    )?;
    // 将子分组的 parent_id 设为 NULL
    conn.execute(
        "UPDATE groups SET parent_id = NULL WHERE parent_id = ?1",
        params![id],
    )?;
    // 删除分组
    conn.execute("DELETE FROM groups WHERE id = ?1", params![id])?;
    Ok(())
}

/// 批量更新分组排序
pub fn reorder_groups(conn: &Connection, orders: &[(String, i32)]) -> SqliteResult<()> {
    for (id, sort_order) in orders {
        conn.execute(
            "UPDATE groups SET sort_order = ?1 WHERE id = ?2",
            params![sort_order, id],
        )?;
    }
    Ok(())
}

/// 获取子分组
pub fn get_child_groups(conn: &Connection, parent_id: Option<&str>) -> SqliteResult<Vec<Group>> {
    let mut stmt = match parent_id {
        Some(pid) => conn.prepare(
            "SELECT * FROM groups WHERE parent_id = ?1 ORDER BY sort_order ASC"
        )?,
        None => conn.prepare(
            "SELECT * FROM groups WHERE parent_id IS NULL ORDER BY sort_order ASC"
        )?,
    };

    let groups = match parent_id {
        Some(pid) => stmt.query_map(params![pid], Group::from_row)?
            .filter_map(|r| r.ok())
            .collect(),
        None => stmt.query_map([], Group::from_row)?
            .filter_map(|r| r.ok())
            .collect(),
    };
    Ok(groups)
}

/// 获取分组树形结构（扁平化列表，前端自行构建树）
pub fn get_group_tree(conn: &Connection) -> SqliteResult<Vec<Group>> {
    get_groups(conn)
}

/// 获取分组下的笔记数量
pub fn get_note_count_by_group(conn: &Connection, group_id: &str) -> SqliteResult<i64> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM notes WHERE group_id = ?1 AND is_trashed = 0",
        params![group_id],
        |row| row.get(0),
    )?;
    Ok(count)
}
