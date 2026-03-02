// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
mod db;
mod processes;
mod scraper;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["CommandOrControl+Shift+Q"])
                .unwrap()
                .with_handler(|app, shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        processes::kill_kiosk_browsers();
                    }
                })
                .build(),
        )
        .setup(|app| {
            let conn = db::init_db(app.handle()).expect("Failed to initialize DB");
            app.manage(db::AppState {
                db: std::sync::Mutex::new(conn),
            });

            // Start background gamepad listener to kill Kiosk on Select+Start
            processes::start_gamepad_listener(app.handle().clone());
            processes::start_global_mouse_listener();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            processes::launch_executable,
            processes::launch_kiosk,
            processes::get_executable_metadata,
            scraper::fetch_and_parse_links,
            scraper::check_links_health,
            scraper::fetch_site_metadata,
            scraper::sanitize_web_url,
            scraper::fetch_fallback_image,
            db::get_items,
            db::add_item,
            db::delete_item
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
