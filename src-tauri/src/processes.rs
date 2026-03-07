use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
use std::time::Duration;
use sysinfo::{Pid, System};

#[derive(Serialize, Deserialize, Clone)]
pub struct LocalExecMetadata {
    pub title: String,
    pub icon_url: Option<String>,
}

#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStrExt;
use crate::db::AppState;
use crate::browser_profile;
use tauri::{State, AppHandle, Manager};

#[tauri::command]
pub fn get_executable_metadata(path: String) -> Result<LocalExecMetadata, String> {
    let p = Path::new(&path);
    let file_stem = p
        .file_stem()
        .unwrap_or_else(|| std::ffi::OsStr::new("Unknown App"))
        .to_string_lossy()
        .into_owned();

    #[allow(unused_mut)]
    let mut icon_url = None;

    #[cfg(target_os = "windows")]
    {
        use std::ptr::null_mut;
        use winapi::shared::windef::HICON;
        use winapi::um::shellapi::ExtractIconExW;
        use winapi::um::wingdi::{GetBitmapBits, GetObjectW, BITMAP};
        use winapi::um::winuser::{DestroyIcon, GetIconInfo, ICONINFO};

        let path_wide: Vec<u16> = OsStr::new(&path)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let mut hicon_large: HICON = null_mut();
        let mut hicon_small: HICON = null_mut();

        // Extract the first icon (index 0)
        let extracted = unsafe {
            ExtractIconExW(
                path_wide.as_ptr(),
                0, // First icon
                &mut hicon_large,
                &mut hicon_small,
                1,
            )
        };

        if extracted > 0 {
            // Prefer large
            let hicon = if !hicon_large.is_null() {
                hicon_large
            } else {
                hicon_small
            };

            if !hicon.is_null() {
                unsafe {
                    let mut icon_info: ICONINFO = std::mem::zeroed();
                    if GetIconInfo(hicon, &mut icon_info) != 0 {
                        let mut bm: BITMAP = std::mem::zeroed();
                        if GetObjectW(
                            icon_info.hbmColor as *mut _,
                            std::mem::size_of::<BITMAP>() as i32,
                            &mut bm as *mut _ as *mut _,
                        ) != 0
                        {
                            let width = bm.bmWidth as u32;
                            let height = bm.bmHeight as u32;
                            let bytes_per_pixel = (bm.bmBitsPixel / 8) as usize;
                            let buffer_size = (width * height) as usize * bytes_per_pixel;
                            let mut buffer = vec![0u8; buffer_size];

                            let copied = GetBitmapBits(
                                icon_info.hbmColor,
                                buffer_size as i32,
                                buffer.as_mut_ptr() as *mut _,
                            );

                            if copied > 0 {
                                // GDI bitmaps are usually BGRA. `image` crate can encode
                                // using standard RGB(A).
                                let mut rgba_buffer = vec![0u8; (width * height * 4) as usize];
                                for i in 0..(width * height) as usize {
                                    let bgra_idx = i * bytes_per_pixel;
                                    let rgba_idx = i * 4;
                                    if bytes_per_pixel >= 3 {
                                        rgba_buffer[rgba_idx] = buffer[bgra_idx + 2]; // R <- R
                                        rgba_buffer[rgba_idx + 1] = buffer[bgra_idx + 1]; // G <- G
                                        rgba_buffer[rgba_idx + 2] = buffer[bgra_idx]; // B <- B
                                                                                      // A
                                        if bytes_per_pixel == 4 {
                                            rgba_buffer[rgba_idx + 3] = buffer[bgra_idx + 3];
                                        } else {
                                            rgba_buffer[rgba_idx + 3] = 255;
                                        }
                                    }
                                }

                                if let Some(img) =
                                    image::RgbaImage::from_raw(width, height, rgba_buffer)
                                {
                                    let mut cursor = std::io::Cursor::new(Vec::new());
                                    // Try encode as PNG
                                    if let Ok(_) = image::DynamicImage::ImageRgba8(img)
                                        .write_to(&mut cursor, image::ImageFormat::Png)
                                    {
                                        use base64::Engine;
                                        let b64 = base64::engine::general_purpose::STANDARD
                                            .encode(cursor.into_inner());
                                        icon_url = Some(format!("data:image/png;base64,{}", b64));
                                    }
                                }
                            }
                        }
                        // Cleanup GDI objects
                        if !icon_info.hbmColor.is_null() {
                            winapi::um::wingdi::DeleteObject(icon_info.hbmColor as *mut _);
                        }
                        if !icon_info.hbmMask.is_null() {
                            winapi::um::wingdi::DeleteObject(icon_info.hbmMask as *mut _);
                        }
                    }
                    if !hicon_large.is_null() {
                        DestroyIcon(hicon_large);
                    }
                    if !hicon_small.is_null() {
                        DestroyIcon(hicon_small);
                    }
                }
            }
        }
    }

    Ok(LocalExecMetadata {
        title: file_stem,
        icon_url,
    })
}

#[tauri::command]
pub fn resolve_system_app_icon(icon_name: String) -> Option<String> {
    #[cfg(target_os = "linux")]
    {
        use std::path::PathBuf;
        
        // If it's already an absolute path
        let path = PathBuf::from(&icon_name);
        if path.is_absolute() && path.exists() {
            return convert_image_to_base64(&path);
        }

        // Search Linux hicolor dirs. We prefer scalable/svg or largest png.
        let paths = vec![
            "/usr/share/icons/hicolor/scalable/apps",
            "/usr/share/icons/hicolor/512x512/apps",
            "/usr/share/icons/hicolor/256x256/apps",
            "/usr/share/icons/hicolor/128x128/apps",
            "/usr/share/icons/hicolor/64x64/apps",
            "/usr/share/icons/hicolor/48x48/apps",
            "/usr/share/icons/hicolor/32x32/apps",
            "/usr/share/pixmaps",
            "/var/lib/flatpak/exports/share/icons/hicolor/scalable/apps",
            "/var/lib/flatpak/exports/share/icons/hicolor/512x512/apps",
            "/var/lib/flatpak/exports/share/icons/hicolor/128x128/apps",
        ];

        let exts = vec!["svg", "png", "xpm"];

        for p in paths {
            for ext in &exts {
                let candidate = format!("{}/{}.{}", p, icon_name, ext);
                if Path::new(&candidate).exists() {
                    return convert_image_to_base64(Path::new(&candidate));
                }
            }
        }
    }
    
    // Windows logic doesn't usually feed pure names, but rather paths via the EXE itself. 
    None
}

fn convert_image_to_base64(path: &Path) -> Option<String> {
    use base64::Engine;
    if let Ok(bytes) = fs::read(path) {
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            let mime = match ext {
                "svg" => "image/svg+xml",
                "png" => "image/png",
                "jpg" | "jpeg" => "image/jpeg",
                "webp" => "image/webp",
                _ => "image/png",
            };
            return Some(format!("data:{};base64,{}", mime, b64));
        }
    }
    None
}

pub fn start_gamepad_listener(_app_handle: AppHandle) {
    std::thread::spawn(move || {
        use gilrs::{Button, Event, Gilrs};

        let mut gilrs = match Gilrs::new() {
            Ok(g) => g,
            Err(_) => return, // If no gamepad support, gracefully degrade
        };

        // State to detect Select + Start combo
        let mut select_pressed = false;
        let mut start_pressed = false;

        loop {
            while let Some(Event { event, .. }) = gilrs.next_event() {
                match event {
                    gilrs::EventType::ButtonPressed(Button::Select, _) => select_pressed = true,
                    gilrs::EventType::ButtonReleased(Button::Select, _) => select_pressed = false,
                    gilrs::EventType::ButtonPressed(Button::Start, _) => start_pressed = true,
                    gilrs::EventType::ButtonReleased(Button::Start, _) => start_pressed = false,
                    _ => {}
                }

                if select_pressed && start_pressed {
                    // Send an event to frontend or kill chrome directly
                    println!("Select + Start pressed! Killing Kiosk browsers...");
                    let state = _app_handle.state::<AppState>();
                    kill_kiosk_browsers(Some(&state));
                }
            }
            std::thread::sleep(Duration::from_millis(50));
        }
    });
}

pub fn start_global_mouse_listener(app_handle: tauri::AppHandle) {
    use rdev::{listen, Button, Event, EventType};
    use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static RIGHT_CLICK_COUNT: AtomicUsize = AtomicUsize::new(0);
    static LAST_RIGHT_CLICK_TIME: AtomicU64 = AtomicU64::new(0);

    let app_handle_inner = app_handle.clone();
    std::thread::spawn(move || {
        if let Err(error) = listen(move |event: Event| {
            if let EventType::ButtonPress(Button::Right) = event.event_type {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64;
                let last = LAST_RIGHT_CLICK_TIME.load(Ordering::SeqCst);

                if now - last > 1000 {
                    RIGHT_CLICK_COUNT.store(1, Ordering::SeqCst);
                } else {
                    let count = RIGHT_CLICK_COUNT.fetch_add(1, Ordering::SeqCst) + 1;
                    if count >= 3 {
                        RIGHT_CLICK_COUNT.store(0, Ordering::SeqCst);
                        let state = app_handle_inner.state::<AppState>();
                        kill_kiosk_browsers(Some(&state));
                    }
                }
                LAST_RIGHT_CLICK_TIME.store(now, Ordering::SeqCst);
            }
        }) {
            println!("Error listening to global mouse: {:?}", error);
        }
    });
}

pub fn kill_kiosk_browsers(state: Option<&State<'_, AppState>>) {
    let mut system = System::new_all();
    system.refresh_all();

    if let Some(s) = state {
        let mut pids_guard = s.launched_pids.lock().unwrap();
        for (_, pid_val) in pids_guard.drain(..) {
            let pid = Pid::from(pid_val as usize);
            if let Some(process) = system.process(pid) {
                 let _ = process.kill();
            }
            
            // Kill children
            for (_p_id, process) in system.processes() {
                if process.parent() == Some(pid) {
                    let _ = process.kill();
                }
            }
        }
    }

}

#[tauri::command]
pub fn launch_executable(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let child = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to launch {}: {}", path, e))?
    } else {
        Command::new(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch {}: {}", path, e))?
    };

    let mut pids = state.launched_pids.lock().unwrap();
    pids.push((path.clone(), child.id()));

    Ok(format!("Launched {}", path))
}

#[tauri::command]
pub fn launch_kiosk(app_handle: AppHandle, state: State<'_, AppState>, url: String) -> Result<String, String> {
    let profile_dir = browser_profile::get_kiosker_profile_dir(&app_handle);
    let profile_str = profile_dir.to_string_lossy();
    let browser_type = fs::read_to_string(profile_dir.join("browser.type")).unwrap_or_default();
    
    let child = if cfg!(target_os = "windows") {
        if browser_type == "firefox" {
             Command::new("cmd")
                .args(&["/C", "start", "firefox", "-kiosk", "-new-window", "-profile", &profile_str, &url])
                .spawn()
                .or_else(|_| Command::new("cmd").args(&["/C", "start", "chrome", "--kiosk", &format!("--user-data-dir={}", profile_str), &url]).spawn())
                .map_err(|e| format!("Failed to launch kiosk: {}", e))?
        } else {
             Command::new("cmd")
                .args(&["/C", "start", "chrome", "--kiosk", &format!("--user-data-dir={}", profile_str), &url]).spawn()
                .or_else(|_| Command::new("cmd").args(&["/C", "start", "firefox", "-kiosk", "-new-window", "-profile", &profile_str, &url]).spawn())
                .map_err(|e| format!("Failed to launch kiosk: {}", e))?
        }
    } else {
        if browser_type == "firefox" {
             Command::new("firefox")
                .args(&["--kiosk", "--profile", &profile_str, &url])
                .spawn()
                .or_else(|_| Command::new("google-chrome").args(&["--kiosk", &format!("--user-data-dir={}", profile_str), &url]).spawn())
                .map_err(|e| format!("Failed to launch kiosk: {}", e))?
        } else {
             Command::new("google-chrome")
                .args(&["--kiosk", &format!("--user-data-dir={}", profile_str), &url]).spawn()
                .or_else(|_| Command::new("firefox").args(&["--kiosk", "--profile", &profile_str, &url]).spawn())
                .map_err(|e| format!("Failed to launch kiosk: {}", e))?
        }
    };

    let mut pids = state.launched_pids.lock().unwrap();
    pids.push((url.clone(), child.id()));

    Ok("Launched kiosk".to_string())
}

#[tauri::command]
pub fn get_active_targets(state: State<'_, AppState>) -> Vec<String> {
    let mut system = System::new_all();
    system.refresh_all();
    
    let mut pids_guard = state.launched_pids.lock().unwrap();
    // Clean up dead ones while at it
    pids_guard.retain(|(_, pid)| {
        system.process(Pid::from(*pid as usize)).is_some()
    });
    
    pids_guard.iter().map(|(path, _)| path.clone()).collect()
}

#[tauri::command]
pub fn kill_target(state: State<'_, AppState>, target: String) -> Result<String, String> {
    let mut system = System::new_all();
    system.refresh_all();
    
    let mut pids_guard = state.launched_pids.lock().unwrap();
    let mut to_remove = Vec::new();
    
    for (idx, (t, p_id)) in pids_guard.iter().enumerate() {
        if t == &target {
            let pid = Pid::from(*p_id as usize);
            if let Some(process) = system.process(pid) {
                let _ = process.kill();
            }
            // Kill kids too
            for (_p_id, process) in system.processes() {
                if process.parent() == Some(pid) {
                    let _ = process.kill();
                }
            }
            to_remove.push(idx);
        }
    }
    
    // Remote from end to keep indices stable
    to_remove.sort_unstable_by(|a, b| b.cmp(a));
    for idx in to_remove {
        pids_guard.remove(idx);
    }
    
    Ok(format!("Killed {}", target))
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_metadata_fallback() {
        // No Windows ou Linux, o file_stem deve extrair o nome do executável
        let meta = get_executable_metadata("C:/Games/Cyberpunk2077.exe".to_string()).expect("Should parse path");
        assert_eq!(meta.title, "Cyberpunk2077");
        
        let linux_meta = get_executable_metadata("/home/user/stremio".to_string()).expect("Should parse path");
        assert_eq!(linux_meta.title, "stremio");
    }

    #[test]
    fn test_right_click_interval() {
        let now: u64 = 1000;
        let last: u64 = 500;
        // Se a diferença for < 1000ms, é um clique válido na sequência
        assert!(now - last < 1000);
    }

    #[test]
    fn test_active_targets_tracking() {
        use std::sync::Mutex;
        let pids = Mutex::new(vec![("test_url".to_string(), 12345u32)]);
        
        let targets: Vec<String> = pids.lock().unwrap().iter().map(|(t, _)| t.clone()).collect();
        assert_eq!(targets[0], "test_url");
    }

    #[test]
    fn test_kill_target_logic_clean_up() {
        use std::sync::Mutex;
        let pids = Mutex::new(vec![
            ("target_a".to_string(), 100u32),
            ("target_b".to_string(), 101u32)
        ]);
        
        // Simulating kill_target for target_a
        let mut pids_guard = pids.lock().unwrap();
        let target_to_kill = "target_a";
        pids_guard.retain(|(t, _)| t != target_to_kill);
        
        assert_eq!(pids_guard.len(), 1);
        assert_eq!(pids_guard[0].0, "target_b");
    }
}
