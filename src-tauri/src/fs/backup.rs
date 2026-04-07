use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// 备份元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMeta {
    /// 备份版本号
    pub version: String,
    /// 备份创建时间
    pub created_at: String,
    /// 备份数据中的应用版本
    pub app_version: String,
    /// 备份包含的笔记数量
    pub note_count: i32,
}

/// 导出数据结构 - 包含所有应用数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportData {
    /// 备份元数据
    pub meta: BackupMeta,
    /// 所有笔记
    pub notes: Vec<NoteExport>,
    /// 所有分组
    pub groups: Vec<GroupExport>,
    /// 所有设置
    pub settings: Vec<SettingExport>,
}

/// 导出的笔记数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteExport {
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

/// 导入结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    /// 导入的笔记数量
    pub notes_imported: i32,
    /// 导入的分组数量
    pub groups_imported: i32,
    /// 导入的设置数量
    pub settings_imported: i32,
    /// 跳过的数量（因冲突等原因）
    pub skipped: i32,
}

/// 获取默认备份目录路径
pub fn get_backup_dir() -> Result<PathBuf, String> {
    let app_dir = dirs::data_local_dir()
        .or_else(dirs::data_dir)
        .ok_or_else(|| "无法确定应用数据目录".to_string())?;

    let backup_dir = app_dir.join("BreezeNote").join("backups");
    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir)
            .map_err(|e| format!("创建备份目录失败: {}", e))?;
    }
    Ok(backup_dir)
}

/// 从数据库导出所有数据为 JSON 格式
pub fn export_all_data(conn: &Connection) -> Result<ExportData, String> {
    let app_version = env!("CARGO_PKG_VERSION").to_string();
    let created_at = chrono::Utc::now().to_rfc3339();

    // 导出笔记
    let mut notes = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT id, title, content, group_id, is_pinned, is_starred, is_archived,
                is_trashed, template, sort_order, created_at, updated_at, trashed_at
         FROM notes ORDER BY sort_order ASC, updated_at DESC"
    ).map_err(|e| format!("准备笔记查询失败: {}", e))?;

    let note_rows = stmt.query_map([], |row| {
        Ok(NoteExport {
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
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
            trashed_at: row.get(12)?,
        })
    }).map_err(|e| format!("查询笔记失败: {}", e))?;

    for note in note_rows {
        notes.push(note.map_err(|e| format!("读取笔记数据失败: {}", e))?);
    }

    let note_count = notes.len() as i32;

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

    // 导出设置
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
        settings.push(setting.map_err(|e| format!("读取设置数据失败: {}", e))?);
    }

    Ok(ExportData {
        meta: BackupMeta {
            version: "1.0".to_string(),
            created_at,
            app_version,
            note_count,
        },
        notes,
        groups,
        settings,
    })
}

/// 导入数据到数据库
/// 支持合并或覆盖两种模式
pub fn import_data(conn: &Connection, data: &ExportData, overwrite: bool) -> Result<ImportResult, String> {
    let mut notes_imported = 0;
    let mut groups_imported = 0;
    let mut settings_imported = 0;
    let mut skipped = 0;

    // 导入分组
    for group in &data.groups {
        // 检查是否已存在
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM groups WHERE id = ?1",
            params![group.id],
            |row| row.get::<_, i32>(0),
        ).unwrap_or(0) > 0;

        if exists && !overwrite {
            skipped += 1;
            continue;
        }

        if exists {
            conn.execute(
                "UPDATE groups SET name = ?1, parent_id = ?2, sort_order = ?3, created_at = ?4 WHERE id = ?5",
                params![group.name, group.parent_id, group.sort_order, group.created_at, group.id],
            ).map_err(|e| format!("更新分组失败: {}", e))?;
        } else {
            conn.execute(
                "INSERT INTO groups (id, name, parent_id, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![group.id, group.name, group.parent_id, group.sort_order, group.created_at],
            ).map_err(|e| format!("插入分组失败: {}", e))?;
        }
        groups_imported += 1;
    }

    // 导入笔记
    for note in &data.notes {
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE id = ?1",
            params![note.id],
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
                 sort_order = ?9, created_at = ?10, updated_at = ?11, trashed_at = ?12
                 WHERE id = ?13",
                params![note.title, note.content, note.group_id, note.is_pinned,
                    note.is_starred, note.is_archived, note.is_trashed, note.template,
                    note.sort_order, note.created_at, note.updated_at, note.trashed_at, note.id],
            ).map_err(|e| format!("更新笔记失败: {}", e))?;
        } else {
            conn.execute(
                "INSERT INTO notes (id, title, content, group_id, is_pinned, is_starred,
                 is_archived, is_trashed, template, sort_order, created_at, updated_at, trashed_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                params![note.id, note.title, note.content, note.group_id, note.is_pinned,
                    note.is_starred, note.is_archived, note.is_trashed, note.template,
                    note.sort_order, note.created_at, note.updated_at, note.trashed_at],
            ).map_err(|e| format!("插入笔记失败: {}", e))?;
        }
        notes_imported += 1;
    }

    // 导入设置
    for setting in &data.settings {
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![setting.key, setting.value],
        ).map_err(|e| format!("导入设置失败: {}", e))?;
        settings_imported += 1;
    }

    Ok(ImportResult {
        notes_imported,
        groups_imported,
        settings_imported,
        skipped,
    })
}

/// 将导出数据保存为 JSON 文件
pub fn save_backup_to_file(data: &ExportData, path: &str) -> Result<(), String> {
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("序列化备份数据失败: {}", e))?;
    fs::write(path, json)
        .map_err(|e| format!("写入备份文件失败: {}", e))?;
    Ok(())
}

/// 从 JSON 文件读取备份数据
pub fn load_backup_from_file(path: &str) -> Result<ExportData, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("读取备份文件失败: {}", e))?;
    let data: ExportData = serde_json::from_str(&content)
        .map_err(|e| format!("解析备份数据失败: {}", e))?;
    Ok(data)
}
