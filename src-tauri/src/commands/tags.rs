use crate::commands::CommandResult;
use crate::db::tags as db_tags;
use crate::db::tags::Tag;
use crate::db::DbState;
use tauri::State;

/// 创建新标签
#[tauri::command]
pub fn create_tag(state: State<DbState>, name: String, color: Option<String>) -> CommandResult<Tag> {
    let conn = state.pool.get().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_tags::create_tag(&conn, &name, color.as_deref())
        .map_err(|e| format!("创建标签失败: {}", e))
}

/// 获取所有标签
#[tauri::command]
pub fn get_tags(state: State<DbState>) -> CommandResult<Vec<Tag>> {
    let conn = state.pool.get().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_tags::get_tags(&conn).map_err(|e| format!("获取标签列表失败: {}", e))
}

/// 根据 ID 获取标签
#[tauri::command]
pub fn get_tag_by_id(state: State<DbState>, id: String) -> CommandResult<Option<Tag>> {
    let conn = state.pool.get().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_tags::get_tag_by_id(&conn, &id)
        .map_err(|e| format!("获取标签失败: {}", e))
}

/// 更新标签
#[tauri::command]
pub fn update_tag(state: State<DbState>, id: String, name: Option<String>, color: Option<String>) -> CommandResult<Tag> {
    let conn = state.pool.get().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_tags::update_tag(&conn, &id, name.as_deref(), color.as_deref())
        .map_err(|e| format!("更新标签失败: {}", e))
}

/// 删除标签
#[tauri::command]
pub fn delete_tag(state: State<DbState>, id: String) -> CommandResult<crate::commands::SuccessResponse> {
    let conn = state.pool.get().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_tags::delete_tag(&conn, &id).map_err(|e| format!("删除标签失败: {}", e))?;
    Ok(crate::commands::SuccessResponse::ok())
}

/// 添加笔记-标签关联
#[tauri::command]
pub fn add_note_tag(state: State<DbState>, note_id: String, tag_id: String) -> CommandResult<crate::commands::SuccessResponse> {
    let conn = state.pool.get().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_tags::add_note_tag(&conn, &note_id, &tag_id).map_err(|e| format!("添加标签关联失败: {}", e))?;
    Ok(crate::commands::SuccessResponse::ok())
}

/// 移除笔记-标签关联
#[tauri::command]
pub fn remove_note_tag(state: State<DbState>, note_id: String, tag_id: String) -> CommandResult<crate::commands::SuccessResponse> {
    let conn = state.pool.get().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_tags::remove_note_tag(&conn, &note_id, &tag_id).map_err(|e| format!("移除标签关联失败: {}", e))?;
    Ok(crate::commands::SuccessResponse::ok())
}

/// 获取笔记的标签列表
#[tauri::command]
pub fn get_note_tags(state: State<DbState>, note_id: String) -> CommandResult<Vec<Tag>> {
    let conn = state.pool.get().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_tags::get_note_tags(&conn, &note_id)
        .map_err(|e| format!("获取笔记标签失败: {}", e))
}

/// 根据标签获取笔记列表
#[tauri::command]
pub fn get_notes_by_tag(state: State<DbState>, tag_id: String) -> CommandResult<Vec<crate::db::notes::Note>> {
    let conn = state.pool.get().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let note_ids = db_tags::get_note_ids_by_tag(&conn, &tag_id)
        .map_err(|e| format!("获取标签关联笔记失败: {}", e))?;
    let mut notes = Vec::new();
    for nid in note_ids {
        if let Some(note) = crate::db::notes::get_note(&conn, &nid)
            .map_err(|e| format!("获取笔记失败: {}", e))?
        {
            notes.push(note);
        }
    }
    Ok(notes)
}

/// 获取标签关联的笔记数量
#[tauri::command]
pub fn get_note_count_by_tag(state: State<DbState>, tag_id: String) -> CommandResult<i64> {
    let conn = state.pool.get().map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_tags::get_note_count_by_tag(&conn, &tag_id)
        .map_err(|e| format!("获取笔记数量失败: {}", e))
}
