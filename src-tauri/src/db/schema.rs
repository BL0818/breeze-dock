use rusqlite::{Connection, Result};

/// 初始化所有数据库表和索引
pub fn init_tables(conn: &Connection) -> Result<()> {
    // PRAGMA 配置
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA cache_size=-2000; PRAGMA synchronous=NORMAL;")?;

    // 建表
    conn.execute_batch(SQL_NOTES)?;
    conn.execute_batch(SQL_TAGS)?;
    conn.execute_batch(SQL_NOTE_TAGS)?;
    conn.execute_batch(SQL_GROUPS)?;
    conn.execute_batch(SQL_NOTE_HISTORY)?;
    conn.execute_batch(SQL_SETTINGS)?;
    conn.execute_batch(SQL_FLOATING_CONFIGS)?;

    // 索引
    conn.execute_batch(SQL_INDEXES)?;
    Ok(())
}

const SQL_NOTES: &str = "
CREATE TABLE IF NOT EXISTS notes (
    id          TEXT    PRIMARY KEY,
    title       TEXT    NOT NULL DEFAULT '',
    content     TEXT    NOT NULL DEFAULT '',
    group_id    TEXT,
    template    TEXT    NOT NULL DEFAULT 'blank',
    is_pinned   INTEGER NOT NULL DEFAULT 0,
    is_starred  INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    is_trashed  INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    word_count  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL,
    trashed_at  TEXT,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);
";

const SQL_TAGS: &str = "
CREATE TABLE IF NOT EXISTS tags (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    color       TEXT    NOT NULL DEFAULT '#007AFF',
    created_at  TEXT    NOT NULL
);
";

const SQL_NOTE_TAGS: &str = "
CREATE TABLE IF NOT EXISTS note_tags (
    id          TEXT    PRIMARY KEY,
    note_id     TEXT    NOT NULL,
    tag_id      TEXT    NOT NULL,
    created_at  TEXT    NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)  REFERENCES tags(id)   ON DELETE CASCADE,
    UNIQUE(note_id, tag_id)
);
";

const SQL_GROUPS: &str = "
CREATE TABLE IF NOT EXISTS groups (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL,
    parent_id   TEXT,
    icon        TEXT    NOT NULL DEFAULT 'folder',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES groups(id) ON DELETE SET NULL
);
";

const SQL_NOTE_HISTORY: &str = "
CREATE TABLE IF NOT EXISTS note_history (
    id          TEXT    PRIMARY KEY,
    note_id     TEXT    NOT NULL,
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    created_at  TEXT    NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
";

const SQL_SETTINGS: &str = "
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT    PRIMARY KEY,
    value       TEXT    NOT NULL
);
";

const SQL_FLOATING_CONFIGS: &str = "
CREATE TABLE IF NOT EXISTS floating_configs (
    id              TEXT    PRIMARY KEY,
    note_id         TEXT    NOT NULL,
    label           TEXT    NOT NULL UNIQUE,
    x               REAL    NOT NULL DEFAULT 100,
    y               REAL    NOT NULL DEFAULT 100,
    width           REAL    NOT NULL DEFAULT 320,
    height          REAL    NOT NULL DEFAULT 400,
    opacity         REAL    NOT NULL DEFAULT 1.0,
    is_penetrable   INTEGER NOT NULL DEFAULT 0,
    is_collapsed    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
";

const SQL_INDEXES: &str = "
CREATE INDEX IF NOT EXISTS idx_notes_group_id     ON notes(group_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_trashed   ON notes(is_trashed);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned    ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_is_starred   ON notes(is_starred);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at   ON notes(updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_template     ON notes(template);
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id  ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id   ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name          ON tags(name);
CREATE INDEX IF NOT EXISTS idx_groups_parent_id   ON groups(parent_id);
CREATE INDEX IF NOT EXISTS idx_note_history_note_id ON note_history(note_id);
CREATE INDEX IF NOT EXISTS idx_floating_configs_note_id ON floating_configs(note_id);
";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init_tables() {
        let conn = Connection::open_in_memory().unwrap();
        assert!(init_tables(&conn).is_ok());

        let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").unwrap();
        let tables: Vec<String> = stmt.query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(tables.contains(&"floating_configs".to_string()));
        assert!(tables.contains(&"groups".to_string()));
        assert!(tables.contains(&"note_history".to_string()));
        assert!(tables.contains(&"note_tags".to_string()));
        assert!(tables.contains(&"notes".to_string()));
        assert!(tables.contains(&"settings".to_string()));
        assert!(tables.contains(&"tags".to_string()));
    }
}
