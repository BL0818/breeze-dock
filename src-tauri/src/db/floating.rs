use rusqlite::{Connection, Result, Row};
use serde::{Deserialize, Serialize};

/// 悬浮窗配置数据模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FloatingConfig {
    pub id: String,
    pub note_id: String,
    pub label: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub opacity: f64,
    pub is_penetrable: bool,
    pub is_collapsed: bool,
    pub created_at: String,
}

impl FloatingConfig {
    /// 从数据库行创建配置
    fn from_row(row: &Row) -> Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            note_id: row.get("note_id")?,
            label: row.get("label")?,
            x: row.get("x")?,
            y: row.get("y")?,
            width: row.get("width")?,
            height: row.get("height")?,
            opacity: row.get("opacity")?,
            is_penetrable: row.get::<_, i32>("is_penetrable")? != 0,
            is_collapsed: row.get::<_, i32>("is_collapsed")? != 0,
            created_at: row.get("created_at")?,
        })
    }
}

/// 创建悬浮窗配置
pub fn create_config(
    conn: &Connection,
    note_id: &str,
    label: &str,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    opacity: f64,
) -> Result<FloatingConfig> {
    let id = format!("floating_{}", generate_timestamp_id());
    let created_at = iso8601_now();

    conn.execute(
        "INSERT INTO floating_configs (id, note_id, label, x, y, width, height, opacity, is_penetrable, is_collapsed, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![
            &id,
            note_id,
            label,
            x,
            y,
            width,
            height,
            opacity,
            0i32, // is_penetrable
            0i32, // is_collapsed
            &created_at,
        ],
    )?;

    get_config(conn, &id)
        .map(|opt| opt.expect("刚插入的记录应该存在"))
}

/// 获取单个配置
pub fn get_config(conn: &Connection, id: &str) -> Result<Option<FloatingConfig>> {
    let mut stmt = conn.prepare(
        "SELECT id, note_id, label, x, y, width, height, opacity, is_penetrable, is_collapsed, created_at
         FROM floating_configs WHERE id = ?1"
    )?;

    let mut rows = stmt.query([id])?;

    if let Some(row) = rows.next()? {
        Ok(Some(FloatingConfig::from_row(row)?))
    } else {
        Ok(None)
    }
}

/// 通过 note_id 获取配置
pub fn get_config_by_note_id(conn: &Connection, note_id: &str) -> Result<Option<FloatingConfig>> {
    let mut stmt = conn.prepare(
        "SELECT id, note_id, label, x, y, width, height, opacity, is_penetrable, is_collapsed, created_at
         FROM floating_configs WHERE note_id = ?1"
    )?;

    let mut rows = stmt.query([note_id])?;

    if let Some(row) = rows.next()? {
        Ok(Some(FloatingConfig::from_row(row)?))
    } else {
        Ok(None)
    }
}

/// 通过 label 获取配置
pub fn get_config_by_label(conn: &Connection, label: &str) -> Result<Option<FloatingConfig>> {
    let mut stmt = conn.prepare(
        "SELECT id, note_id, label, x, y, width, height, opacity, is_penetrable, is_collapsed, created_at
         FROM floating_configs WHERE label = ?1"
    )?;

    let mut rows = stmt.query([label])?;

    if let Some(row) = rows.next()? {
        Ok(Some(FloatingConfig::from_row(row)?))
    } else {
        Ok(None)
    }
}

/// 更新配置 - 使用简单的逐个字段更新避免生命周期问题
pub fn update_config(
    conn: &Connection,
    id: &str,
    updates: &FloatingConfigUpdate,
) -> Result<FloatingConfig> {
    // 获取当前配置
    let current = get_config(conn, id)?
        .ok_or_else(|| rusqlite::Error::InvalidParameterName("配置不存在".to_string()))?;

    // 使用 COALESCE 模式进行更新，只更新提供的字段
    let new_x = updates.x.unwrap_or(current.x);
    let new_y = updates.y.unwrap_or(current.y);
    let new_width = updates.width.unwrap_or(current.width);
    let new_height = updates.height.unwrap_or(current.height);
    let new_opacity = updates.opacity.unwrap_or(current.opacity);
    let new_is_penetrable = updates.is_penetrable.unwrap_or(current.is_penetrable);
    let new_is_collapsed = updates.is_collapsed.unwrap_or(current.is_collapsed);

    conn.execute(
        "UPDATE floating_configs
         SET x = ?1, y = ?2, width = ?3, height = ?4, opacity = ?5,
             is_penetrable = ?6, is_collapsed = ?7
         WHERE id = ?8",
        rusqlite::params![
            new_x,
            new_y,
            new_width,
            new_height,
            new_opacity,
            if new_is_penetrable { 1i32 } else { 0i32 },
            if new_is_collapsed { 1i32 } else { 0i32 },
            &id,
        ],
    )?;

    get_config(conn, id)
        .map(|opt| opt.expect("记录应该存在"))
}

/// 删除配置
pub fn delete_config(conn: &Connection, id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM floating_configs WHERE id = ?1",
        [id],
    )?;
    Ok(())
}

/// 通过 note_id 删除配置
pub fn delete_config_by_note_id(conn: &Connection, note_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM floating_configs WHERE note_id = ?1",
        [note_id],
    )?;
    Ok(())
}

/// 列出所有配置
pub fn list_configs(conn: &Connection) -> Result<Vec<FloatingConfig>> {
    let mut stmt = conn.prepare(
        "SELECT id, note_id, label, x, y, width, height, opacity, is_penetrable, is_collapsed, created_at
         FROM floating_configs ORDER BY created_at DESC"
    )?;

    let rows = stmt.query_map([], |row| FloatingConfig::from_row(row))?;

    rows.collect()
}

/// 配置更新结构体（所有字段可选）
#[derive(Debug, Default)]
pub struct FloatingConfigUpdate {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub opacity: Option<f64>,
    pub is_penetrable: Option<bool>,
    pub is_collapsed: Option<bool>,
}

/// 生成时间戳 ID
fn generate_timestamp_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    format!("{}", now)
}

/// 获取当前 ISO8601 时间
fn iso8601_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs() as i64;
    let nanos = now.subsec_nanos();
    // 使用 chrono 格式化
    chrono::DateTime::from_timestamp(secs, nanos)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| format!("{}", secs))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema::init_tables;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_tables(&conn).unwrap();
        conn
    }

    #[test]
    fn test_create_and_get_config() {
        let conn = setup_test_db();

        let config = create_config(
            &conn,
            "note_123",
            "floating_note_123",
            100.0,
            200.0,
            320.0,
            400.0,
            0.8,
        ).unwrap();

        assert_eq!(config.note_id, "note_123");
        assert_eq!(config.label, "floating_note_123");
        assert_eq!(config.x, 100.0);
        assert_eq!(config.opacity, 0.8);

        // 测试查询
        let found = get_config(&conn, &config.id).unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().note_id, "note_123");
    }

    #[test]
    fn test_update_config() {
        let conn = setup_test_db();

        let config = create_config(
            &conn,
            "note_456",
            "floating_note_456",
            100.0,
            200.0,
            320.0,
            400.0,
            1.0,
        ).unwrap();

        let updates = FloatingConfigUpdate {
            x: Some(150.0),
            y: Some(250.0),
            opacity: Some(0.5),
            is_penetrable: Some(true),
            ..Default::default()
        };

        let updated = update_config(&conn, &config.id, &updates).unwrap();
        assert_eq!(updated.x, 150.0);
        assert_eq!(updated.y, 250.0);
        assert_eq!(updated.opacity, 0.5);
        assert!(updated.is_penetrable);
    }

    #[test]
    fn test_delete_config() {
        let conn = setup_test_db();

        let config = create_config(
            &conn,
            "note_789",
            "floating_note_789",
            100.0,
            200.0,
            320.0,
            400.0,
            1.0,
        ).unwrap();

        delete_config(&conn, &config.id).unwrap();

        let found = get_config(&conn, &config.id).unwrap();
        assert!(found.is_none());
    }
}
