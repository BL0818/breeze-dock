use crate::commands::{CommandResult, SuccessResponse};
use crate::db::notes as db_notes;
use crate::db::notes::{Note, NoteHistory, NoteFilter};
use crate::db::DbState;
use tauri::State;

/// 创建新笔记
#[tauri::command]
pub fn create_note(
    state: State<DbState>,
    title: Option<String>,
    content: Option<String>,
    group_id: Option<String>,
    template: Option<String>,
) -> CommandResult<Note> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::create_note(&conn, db_notes::CreateNoteParams {
        title,
        content,
        group_id,
        template,
    }).map_err(|e| format!("创建笔记失败: {}", e))
}

/// 根据 ID 获取笔记
#[tauri::command]
pub fn get_note(
    state: State<DbState>,
    id: String,
) -> CommandResult<Option<Note>> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::get_note(&conn, &id)
        .map_err(|e| format!("获取笔记失败: {}", e))
}

/// 更新笔记
#[tauri::command]
pub fn update_note(
    state: State<DbState>,
    id: String,
    title: Option<String>,
    content: Option<String>,
    group_id: Option<String>,
    template: Option<String>,
) -> CommandResult<Note> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::update_note(&conn, db_notes::UpdateNoteParams {
        id,
        title,
        content,
        group_id,
        template,
    }).map_err(|e| format!("更新笔记失败: {}", e))
}

/// 将笔记移至回收站
#[tauri::command]
pub fn trash_note(
    state: State<DbState>,
    id: String,
) -> CommandResult<SuccessResponse> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::trash_note(&conn, &id)
        .map_err(|e| format!("移至回收站失败: {}", e))?;
    Ok(SuccessResponse::ok())
}

/// 从回收站恢复笔记
#[tauri::command]
pub fn restore_note(
    state: State<DbState>,
    id: String,
) -> CommandResult<SuccessResponse> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::restore_note(&conn, &id)
        .map_err(|e| format!("恢复笔记失败: {}", e))?;
    Ok(SuccessResponse::ok())
}

/// 永久删除笔记
#[tauri::command]
pub fn delete_note(
    state: State<DbState>,
    id: String,
) -> CommandResult<SuccessResponse> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::delete_note_permanent(&conn, &id)
        .map_err(|e| format!("永久删除笔记失败: {}", e))?;
    Ok(SuccessResponse::ok())
}

/// 获取笔记列表（支持过滤）
#[tauri::command]
pub fn get_notes(
    state: State<DbState>,
    group_id: Option<String>,
    is_pinned: Option<i32>,
    is_starred: Option<i32>,
    is_archived: Option<i32>,
    is_trashed: Option<i32>,
    keyword: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> CommandResult<Vec<Note>> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::get_notes(&conn, &NoteFilter {
        group_id,
        is_pinned,
        is_starred,
        is_archived,
        is_trashed,
        keyword,
        limit,
        offset,
    }).map_err(|e| format!("获取笔记列表失败: {}", e))
}

/// 搜索笔记
#[tauri::command]
pub fn search_notes(
    state: State<DbState>,
    keyword: String,
    limit: Option<i32>,
) -> CommandResult<Vec<Note>> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::search_notes(&conn, &keyword, limit)
        .map_err(|e| format!("搜索笔记失败: {}", e))
}

/// 切换笔记置顶状态
#[tauri::command]
pub fn pin_note(
    state: State<DbState>,
    id: String,
    pinned: bool,
) -> CommandResult<SuccessResponse> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::toggle_pin(&conn, &id, pinned)
        .map_err(|e| format!("切换置顶失败: {}", e))?;
    Ok(SuccessResponse::ok())
}

/// 切换笔记收藏状态
#[tauri::command]
pub fn star_note(
    state: State<DbState>,
    id: String,
    starred: bool,
) -> CommandResult<SuccessResponse> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::toggle_star(&conn, &id, starred)
        .map_err(|e| format!("切换收藏失败: {}", e))?;
    Ok(SuccessResponse::ok())
}

/// 切换笔记归档状态
#[tauri::command]
pub fn archive_note(
    state: State<DbState>,
    id: String,
    archived: bool,
) -> CommandResult<SuccessResponse> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::toggle_archive(&conn, &id, archived)
        .map_err(|e| format!("切换归档失败: {}", e))?;
    Ok(SuccessResponse::ok())
}

/// 批量更新笔记排序
#[tauri::command]
pub fn reorder_notes(
    state: State<DbState>,
    orders: Vec<(String, i32)>,
) -> CommandResult<SuccessResponse> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::reorder_notes(&conn, &orders)
        .map_err(|e| format!("更新排序失败: {}", e))?;
    Ok(SuccessResponse::ok())
}

/// 获取笔记历史版本列表
#[tauri::command]
pub fn get_note_history(
    state: State<DbState>,
    note_id: String,
) -> CommandResult<Vec<NoteHistory>> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::get_note_history(&conn, &note_id)
        .map_err(|e| format!("获取历史版本失败: {}", e))
}

/// 回滚笔记到指定历史版本
#[tauri::command]
pub fn rollback_note(
    state: State<DbState>,
    note_id: String,
    history_id: String,
) -> CommandResult<Note> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::rollback_note(&conn, &note_id, &history_id)
        .map_err(|e| format!("回滚笔记失败: {}", e))
}

/// 获取回收站中的笔记列表
#[tauri::command]
pub fn get_trash_notes(
    state: State<DbState>,
) -> CommandResult<Vec<Note>> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    db_notes::get_notes(&conn, &NoteFilter {
        is_trashed: Some(1),
        ..Default::default()
    }).map_err(|e| format!("获取回收站笔记失败: {}", e))
}

/// 清空回收站 - 永久删除所有回收站中的笔记
#[tauri::command]
pub fn empty_trash(
    state: State<DbState>,
) -> CommandResult<SuccessResponse> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;
    let trash_notes = db_notes::get_notes(&conn, &NoteFilter {
        is_trashed: Some(1),
        ..Default::default()
    }).map_err(|e| format!("获取回收站笔记失败: {}", e))?;

    for note in trash_notes {
        db_notes::delete_note_permanent(&conn, &note.id)
            .map_err(|e| format!("删除笔记 {} 失败: {}", note.id, e))?;
    }

    Ok(SuccessResponse::ok())
}
