use crate::commands::{CommandResult, SuccessResponse};
use crate::db::groups as db_groups;
use crate::db::groups::Group;
use crate::db::DbState;
use tauri::State;

/// 创建新分组
#[tauri::command]
pub fn create_group(
    state: State<DbState>,
    name: String,
    parent_id: Option<String>,
    icon: Option<String>,
) -> CommandResult<Group> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    db_groups::create_group(&conn, &name, parent_id.as_deref(), icon.as_deref())
        .map_err(|e| format!("创建分组失败: {}", e))
}

/// 获取所有分组
#[tauri::command]
pub fn get_groups(state: State<DbState>) -> CommandResult<Vec<Group>> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    db_groups::get_groups(&conn)
        .map_err(|e| format!("获取分组列表失败: {}", e))
}

/// 根据 ID 获取分组
#[tauri::command]
pub fn get_group_by_id(
    state: State<DbState>,
    id: String,
) -> CommandResult<Option<Group>> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    db_groups::get_group_by_id(&conn, &id)
        .map_err(|e| format!("获取分组失败: {}", e))
}

/// 更新分组
#[tauri::command]
pub fn update_group(
    state: State<DbState>,
    id: String,
    name: Option<String>,
    parent_id: Option<Option<String>>,
    icon: Option<String>,
) -> CommandResult<Group> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    let parent_id_ref = parent_id.as_ref().map(|opt| opt.as_deref());

    db_groups::update_group(&conn, &id, name.as_deref(), parent_id_ref, icon.as_deref())
        .map_err(|e| format!("更新分组失败: {}", e))
}

/// 删除分组
/// 删除后，该分组下的笔记的 group_id 会被设为 NULL
#[tauri::command]
pub fn delete_group(
    state: State<DbState>,
    id: String,
) -> CommandResult<SuccessResponse> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    db_groups::delete_group(&conn, &id)
        .map_err(|e| format!("删除分组失败: {}", e))?;

    Ok(SuccessResponse::ok())
}

/// 批量更新分组排序
/// orders 格式: [["group-id-1", 0], ["group-id-2", 1], ...]
#[tauri::command]
pub fn reorder_groups(
    state: State<DbState>,
    orders: Vec<(String, i32)>,
) -> CommandResult<SuccessResponse> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    db_groups::reorder_groups(&conn, &orders)
        .map_err(|e| format!("更新分组排序失败: {}", e))?;

    Ok(SuccessResponse::ok())
}

/// 获取子分组
#[tauri::command]
pub fn get_child_groups(
    state: State<DbState>,
    parent_id: Option<String>,
) -> CommandResult<Vec<Group>> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    db_groups::get_child_groups(&conn, parent_id.as_deref())
        .map_err(|e| format!("获取子分组失败: {}", e))
}

/// 获取分组树形结构
#[tauri::command]
pub fn get_group_tree(state: State<DbState>) -> CommandResult<Vec<Group>> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    db_groups::get_group_tree(&conn)
        .map_err(|e| format!("获取分组树失败: {}", e))
}

/// 获取分组下的笔记数量
#[tauri::command]
pub fn get_note_count_by_group(
    state: State<DbState>,
    group_id: String,
) -> CommandResult<i64> {
    let conn = state.pool.get()
        .map_err(|e| format!("获取数据库连接失败: {}", e))?;

    db_groups::get_note_count_by_group(&conn, &group_id)
        .map_err(|e| format!("获取笔记数量失败: {}", e))
}
