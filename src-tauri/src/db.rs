use rusqlite::{Connection, Result};
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
}

pub struct AppState {
    pub db: Mutex<Connection>,
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

    let mut stmt = conn.prepare("SELECT id, title, item_type, target_path, icon_url, background_url, description FROM items").map_err(|e| e.to_string())?;

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
        "INSERT INTO items (title, item_type, target_path, icon_url, background_url, description) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&title, &item_type, &target_path, &icon_url, &background_url, &description),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_item(state: State<'_, AppState>, id: i32) -> std::result::Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM items WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
