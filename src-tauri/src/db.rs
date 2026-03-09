use rusqlite::{Connection, Result, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Serialize, Deserialize, Clone)]
pub struct Item {
    pub id: i32,
    pub title: String,
    pub item_type: String,
    pub target_path: String,
    pub icon_url: Option<String>,
    pub background_url: Option<String>,
    pub description: Option<String>,
    pub is_favorite: bool,
}

pub struct AppState {
    pub db: Mutex<Connection>,
    pub launched_pids: Mutex<Vec<(String, u32)>>,
}

pub fn init_db(app_handle: &AppHandle) -> Result<Connection, rusqlite::Error> {
    // Get the standard app data directory (e.g., %APPDATA%/com.moise.kiosker)
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to resolve app data dir");

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
    }

    let db_path = app_dir.join("kiosker.sqlite");
    let conn = Connection::open(db_path)?;

    // Table for Stored Elements (Games, Movies, Apps)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            item_type TEXT NOT NULL, /* 'web', 'exe', 'bin' */
            target_path TEXT NOT NULL,
            icon_url TEXT,
            background_url TEXT,
            description TEXT
        )",
        [],
    )?;

    // Try to migrate existing DB with the new is_favorite column (ignoring error if it already exists)
    let _ = conn.execute("ALTER TABLE items ADD COLUMN is_favorite BOOLEAN DEFAULT 0", []);

    // Table for User Preferences and Persistence (like Autostart)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    Ok(conn)
}

#[tauri::command]
pub fn get_items(state: State<'_, AppState>) -> std::result::Result<Vec<Item>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, title, item_type, target_path, icon_url, background_url, description, is_favorite FROM items").map_err(|e| e.to_string())?;

    let item_iter = stmt
        .query_map([], |row| {
            Ok(Item {
                id: row.get(0)?,
                title: row.get(1)?,
                item_type: row.get(2)?,
                target_path: row.get(3)?,
                icon_url: row.get(4)?,
                background_url: row.get(5)?,
                description: row.get(6)?,
                is_favorite: row.get::<_, i32>(7).unwrap_or(0) != 0,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for item in item_iter {
        items.push(item.map_err(|e| e.to_string())?);
    }

    Ok(items)
}

#[tauri::command]
pub fn add_item(
    state: State<'_, AppState>,
    title: String,
    item_type: String,
    target_path: String,
    icon_url: Option<String>,
    background_url: Option<String>,
    description: Option<String>,
) -> std::result::Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Check for duplicates based on target_path
    let mut stmt = conn
        .prepare("SELECT COUNT(*) FROM items WHERE target_path = ?1")
        .map_err(|e| e.to_string())?;
    let count: i32 = stmt
        .query_row([&target_path], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if count > 0 {
        return Err(format!(
            "Item com o caminho '{}' já existe na biblioteca.",
            target_path
        ));
    }

    conn.execute(
        "INSERT INTO items (title, item_type, target_path, icon_url, background_url, description, is_favorite) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
        (&title, &item_type, &target_path, &icon_url, &background_url, &description),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn toggle_favorite(state: State<'_, AppState>, id: i32, is_favorite: bool) -> std::result::Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE items SET is_favorite = ?1 WHERE id = ?2",
        (if is_favorite { 1 } else { 0 }, id),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_setting(state: State<'_, AppState>, key: String) -> std::result::Result<Option<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1").map_err(|e| e.to_string())?;
    let val: Option<String> = stmt.query_row([key], |row| row.get(0)).optional().map_err(|e| e.to_string())?;
    Ok(val)
}

#[tauri::command]
pub fn update_setting(state: State<'_, AppState>, key: String, value: String) -> std::result::Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_item(state: State<'_, AppState>, id: i32) -> std::result::Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM items WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_item(state: State<'_, AppState>, id: i32, title: String) -> std::result::Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE items SET title = ?1 WHERE id = ?2",
        (&title, id),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn export_database(app_handle: AppHandle) -> std::result::Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("kiosker.sqlite");
    
    if !db_path.exists() {
        return Err("Banco de dados não encontrado.".to_string());
    }

    let file_path = app_handle.dialog().file().set_title("Exportar Biblioteca").set_file_name("kiosker_backup.sqlite").blocking_save_file();
    
    if let Some(dest) = file_path {
        fs::copy(&db_path, dest.to_string()).map_err(|e| e.to_string())?;
        Ok("Biblioteca exportada com sucesso!".to_string())
    } else {
        Err("Operação cancelada.".to_string())
    }
}

#[tauri::command]
pub async fn import_database(app_handle: AppHandle, state: State<'_, AppState>) -> std::result::Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let file_path = app_handle.dialog().file().set_title("Importar Biblioteca").add_filter("SQLite", &["sqlite", "db"]).blocking_pick_file();
    
    if let Some(src) = file_path {
        let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
        let db_path = app_dir.join("kiosker.sqlite");
        
        // On Windows, the file is locked while the Connection is open.
        // We replace the connection with a temporary in-memory one to close the file.
        {
            let mut conn = state.db.lock().map_err(|e| e.to_string())?;
            *conn = Connection::open_in_memory().map_err(|e| e.to_string())?;
        }
        
        // Small delay to ensure the OS releases the file lock
        std::thread::sleep(std::time::Duration::from_millis(100));

        fs::copy(src.to_string(), &db_path).map_err(|e| e.to_string())?;
        
        // Re-initialize the connection to the new database file
        {
            let mut conn = state.db.lock().map_err(|e| e.to_string())?;
            *conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        }

        Ok("Biblioteca importada com sucesso!".to_string())
    } else {
        Err("Operação cancelada.".to_string())
    }
}
#[cfg(test)]
mod tests {
    
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE items (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                item_type TEXT NOT NULL,
                target_path TEXT NOT NULL,
                icon_url TEXT,
                background_url TEXT,
                description TEXT
            )",
            [],
        ).unwrap();
        conn.execute(
            "CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        ).unwrap();
        conn
    }

    #[test]
    fn test_add_and_get_item() {
        let conn = setup_test_db();
        
        // Simulating add_item logic
        conn.execute(
            "INSERT INTO items (title, item_type, target_path) VALUES (?1, ?2, ?3)",
            ("Test App", "exe", "C:/test.exe"),
        ).unwrap();

        let mut stmt = conn.prepare("SELECT title FROM items").unwrap();
        let title: String = stmt.query_row([], |row| row.get(0)).unwrap();
        assert_eq!(title, "Test App");
    }

    #[test]
    fn test_browser_persistence() {
        let conn = setup_test_db();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            ("preferred_browser", "firefox"),
        ).unwrap();
        let val: String = conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            ["preferred_browser"],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(val, "firefox");

        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            ("preferred_browser", "chrome"),
        ).unwrap();
        let val_new: String = conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            ["preferred_browser"],
            |row| row.get(0),
        ).unwrap();
        assert_eq!(val_new, "chrome");
    }

    #[test]
    fn test_language_persistence() {
        let conn = setup_test_db();
        let languages = ["pt", "en", "es", "zh"];
        for lang in languages {
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
                ("language", lang),
            ).unwrap();
            let stored: String = conn.query_row(
                "SELECT value FROM settings WHERE key = ?1",
                ["language"],
                |row| row.get(0),
            ).unwrap();
            assert_eq!(stored, lang);
        }
    }
}
