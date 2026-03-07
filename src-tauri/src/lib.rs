// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
mod db;
mod processes;
mod scraper;
mod browser_profile;
mod system_apps;
mod system_status;

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
                .map(|b| b.with_handler(|app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        let state = app.state::<db::AppState>();
                        processes::kill_kiosk_browsers(Some(&state));
                    }
                }))
                .unwrap_or_else(|e| {
                    eprintln!("Failed to register global shortcut: {}", e);
                    tauri_plugin_global_shortcut::Builder::new()
                })
                .build(),
        )
        .setup(|app| {
            let conn = db::init_db(app.handle()).expect("Failed to initialize DB");
            app.manage(db::AppState {
                db: std::sync::Mutex::new(conn),
                launched_pids: std::sync::Mutex::new(Vec::new()),
            });
            processes::start_gamepad_listener(app.handle().clone());
            processes::start_global_mouse_listener(app.handle().clone());

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
            db::delete_item,
            db::toggle_favorite,
            db::get_setting,
            db::update_setting,
            system_apps::get_system_apps,
            processes::get_active_targets,
            processes::kill_target,
            processes::resolve_system_app_icon,
            browser_profile::run_browser_migration,
            system_status::get_system_status,
            system_status::open_wifi_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
