pub mod schema;
pub mod notes;
pub mod crypto;
pub mod tags;
pub mod groups;
pub mod floating;

use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use std::sync::Mutex;

/// 应用数据库状态
pub struct DbState {
    pub pool: Pool<SqliteConnectionManager>,
    pub encryption_key: Mutex<Option<Vec<u8>>>,
}

impl DbState {
    pub fn new(db_path: &str) -> Result<Self, String> {
        let manager = SqliteConnectionManager::file(db_path)
            .with_init(|conn| {
                conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            });
        let pool = Pool::new(manager)
            .map_err(|e| format!("创建数据库连接池失败: {}", e))?;

        let conn = pool.get()
            .map_err(|e| format!("获取数据库连接失败: {}", e))?;
        schema::init_tables(&conn)
            .map_err(|e| format!("初始化数据库表失败: {}", e))?;

        Ok(Self {
            pool,
            encryption_key: Mutex::new(None),
        })
    }
}

pub fn get_db_path() -> Result<std::path::PathBuf, String> {
    let app_dir = dirs::data_local_dir()
        .or_else(dirs::data_dir)
        .ok_or_else(|| "无法确定应用数据目录".to_string())?;

    let db_dir = app_dir.join("BreezeNote");
    if !db_dir.exists() {
        std::fs::create_dir_all(&db_dir)
            .map_err(|e| format!("创建数据库目录失败: {}", e))?;
    }

    Ok(db_dir.join("breezenote.db"))
}
