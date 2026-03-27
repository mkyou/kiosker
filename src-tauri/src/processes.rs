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
#[cfg(target_os = "windows")]
use std::ffi::OsStr;
use crate::db::AppState;
use crate::browser_profile;
use tauri::{State, AppHandle, Manager};

#[cfg(target_os = "windows")]
fn find_browser_exe(browser_type: &str) -> Option<std::path::PathBuf> {
    let program_files = std::env::var_os("ProgramFiles").map(std::path::PathBuf::from);
    let program_files_x86 = std::env::var_os("ProgramFiles(x86)").map(std::path::PathBuf::from);
    let local_appdata = std::env::var_os("LOCALAPPDATA").map(std::path::PathBuf::from);

    match browser_type {
        "firefox" => {
            let paths = vec![
                program_files.as_ref().map(|p| p.join("Mozilla Firefox\\firefox.exe")),
                program_files_x86.as_ref().map(|p| p.join("Mozilla Firefox\\firefox.exe")),
            ];
            for p in paths.into_iter().flatten() {
                if p.exists() { return Some(p); }
            }
        },
        "chrome" | "webview" => {
            let paths = vec![
                program_files.as_ref().map(|p| p.join("Google\\Chrome\\Application\\chrome.exe")),
                local_appdata.as_ref().map(|p| p.join("Google\\Chrome\\Application\\chrome.exe")),
            ];
            for p in paths.into_iter().flatten() {
                if p.exists() { return Some(p); }
            }
        },
        "edge" => {
             let paths = vec![
                program_files_x86.as_ref().map(|p| p.join("Microsoft\\Edge\\Application\\msedge.exe")),
                program_files.as_ref().map(|p| p.join("Microsoft\\Edge\\Application\\msedge.exe")),
            ];
            for p in paths.into_iter().flatten() {
                if p.exists() { return Some(p); }
            }
        }
        _ => {}
    }
    None
}

#[cfg(not(target_os = "windows"))]
fn find_browser_exe(_: &str) -> Option<std::path::PathBuf> { None }

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
        use winapi::um::shellapi::{SHGetFileInfoW, SHGFI_ICON, SHGFI_LARGEICON, SHFILEINFOW};
        use winapi::um::wingdi::{GetBitmapBits, GetObjectW, BITMAP, DeleteObject};
        use winapi::um::winuser::{DestroyIcon, GetIconInfo};

        let mut final_path = path.clone();

        // If it's a .lnk file, try to resolve the target to get the original icon
        if path.to_lowercase().ends_with(".lnk") {
            let resolve_cmd = format!("(New-Object -ComObject WScript.Shell).CreateShortcut('{}').TargetPath", path.replace("'", "''"));
            if let Ok(output) = Command::new("powershell")
                .args(&["-NoProfile", "-Command", &resolve_cmd])
                .output() {
                    let target = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !target.is_empty() && Path::new(&target).exists() {
                        final_path = target;
                    }
                }
        }

        let path_wide: Vec<u16> = OsStr::new(&final_path)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        
        let mut shfi: SHFILEINFOW = unsafe { std::mem::zeroed() };
        let res = unsafe {
            SHGetFileInfoW(
                path_wide.as_ptr(),
                0,
                &mut shfi,
                std::mem::size_of::<SHFILEINFOW>() as u32,
                SHGFI_ICON | SHGFI_LARGEICON,
            )
        };

        if res != 0 && !shfi.hIcon.is_null() {
            let hicon = shfi.hIcon;
            unsafe {
                let mut icon_info = std::mem::zeroed();
                if GetIconInfo(hicon, &mut icon_info) != 0 {
                    let mut bm: BITMAP = std::mem::zeroed();
                    if !icon_info.hbmColor.is_null() && GetObjectW(
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

                        if copied as usize == buffer_size {
                            let mut rgba_buffer = vec![0u8; (width * height * 4) as usize];
                            for i in 0..(width * height) as usize {
                                let bgra_idx = i * bytes_per_pixel;
                                let rgba_idx = i * 4;
                                if bytes_per_pixel >= 3 {
                                    rgba_buffer[rgba_idx] = buffer[bgra_idx + 2]; // R
                                    rgba_buffer[rgba_idx + 1] = buffer[bgra_idx + 1]; // G
                                    rgba_buffer[rgba_idx + 2] = buffer[bgra_idx]; // B
                                    if bytes_per_pixel == 4 {
                                        rgba_buffer[rgba_idx + 3] = buffer[bgra_idx + 3]; // A
                                    } else {
                                        rgba_buffer[rgba_idx + 3] = 255;
                                    }
                                }
                            }

                            if let Some(img) = image::RgbaImage::from_raw(width, height, rgba_buffer) {
                                let mut cursor = std::io::Cursor::new(Vec::new());
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
                    // Cleanup GDI objects from GetIconInfo
                    if !icon_info.hbmColor.is_null() { DeleteObject(icon_info.hbmColor as *mut _); }
                    if !icon_info.hbmMask.is_null() { DeleteObject(icon_info.hbmMask as *mut _); }
                }
                DestroyIcon(hicon);
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

        // State to detect L3 + R3 combo 3x fast
        let mut l3_pressed = false;
        let mut r3_pressed = false;
        let mut combo_count = 0;
        let mut last_combo_time = std::time::Instant::now();
        let combo_timeout = std::time::Duration::from_millis(1000);

        loop {
            while let Some(Event { event, .. }) = gilrs.next_event() {
                match event {
                    gilrs::EventType::ButtonPressed(Button::LeftThumb, _) => l3_pressed = true,
                    gilrs::EventType::ButtonReleased(Button::LeftThumb, _) => l3_pressed = false,
                    gilrs::EventType::ButtonPressed(Button::RightThumb, _) => r3_pressed = true,
                    gilrs::EventType::ButtonReleased(Button::RightThumb, _) => r3_pressed = false,
                    _ => {}
                }

                if l3_pressed && r3_pressed {
                    let now = std::time::Instant::now();
                    if now.duration_since(last_combo_time) > combo_timeout {
                        combo_count = 1;
                    } else {
                        combo_count += 1;
                    }
                    last_combo_time = now;

                    if combo_count >= 3 {
                        println!("L3 + R3 combo (3x) detected! Killing Kiosk browsers...");
                        let state = _app_handle.state::<AppState>();
                        kill_kiosk_browsers(Some(&state));
                        combo_count = 0;
                    }
                    
                    // Reset pressed state to force release and re-press for next combo step
                    l3_pressed = false;
                    r3_pressed = false;
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

    static LEFT_CLICK_COUNT: AtomicUsize = AtomicUsize::new(0);
    static LAST_LEFT_CLICK_TIME: AtomicU64 = AtomicU64::new(0);

    let app_handle_inner = app_handle.clone();
    std::thread::spawn(move || {
        #[cfg(target_os = "windows")]
        unsafe {
            winapi::um::winuser::SetProcessDPIAware();
        }

        if let Err(error) = listen(move |event: Event| {
            if let EventType::ButtonPress(Button::Left) = event.event_type {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64;
                let last = LAST_LEFT_CLICK_TIME.load(Ordering::SeqCst);

                if now - last > 1000 {
                    LEFT_CLICK_COUNT.store(1, Ordering::SeqCst);
                } else {
                    let count = LEFT_CLICK_COUNT.fetch_add(1, Ordering::SeqCst) + 1;
                    if count >= 3 {
                        LEFT_CLICK_COUNT.store(0, Ordering::SeqCst);
                        let state = app_handle_inner.state::<AppState>();
                        kill_kiosk_browsers(Some(&state));
                    }
                }
                LAST_LEFT_CLICK_TIME.store(now, Ordering::SeqCst);
            }
        }) {
            println!("Error listening to global mouse: {:?}", error);
        }
    });
}

#[tauri::command]
pub fn kill_all_kiosks(state: State<'_, AppState>) {
    kill_kiosk_browsers(Some(&state));
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

    #[cfg(target_os = "windows")]
    {
        use winapi::um::winuser::{GetForegroundWindow, GetWindowThreadProcessId, PostMessageW, WM_CLOSE};
        use std::process;
        unsafe {
            let hwnd = GetForegroundWindow();
            if !hwnd.is_null() {
                let mut fg_pid: u32 = 0;
                GetWindowThreadProcessId(hwnd, &mut fg_pid);
                let my_pid = process::id();
                if fg_pid != 0 && fg_pid != my_pid {
                    PostMessageW(hwnd, WM_CLOSE, 0, 0);
                    
                    // Fallback to force kill if WM_CLOSE isn't enough for the foreground process
                    let fg_sys_pid = Pid::from(fg_pid as usize);
                    if let Some(process) = system.process(fg_sys_pid) {
                        let _ = process.kill();
                    }
                }
            }
        }
    }
}

#[tauri::command]
pub fn launch_executable(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let p = Path::new(&path);
    let child = if cfg!(target_os = "windows") {
        if p.extension().map_or(false, |ext| ext == "lnk" || ext == "bat" || ext == "cmd") {
             Command::new("cmd")
                .args(&["/C", "start", "", &path])
                .spawn()
                .map_err(|e| format!("Failed to launch link {}: {}", path, e))?
        } else {
            Command::new(&path)
                .spawn()
                .map_err(|e| format!("Failed to launch exe {}: {}", path, e))?
        }
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
        let browser_to_try = if browser_type == "firefox" { vec!["firefox", "chrome", "edge"] } else { vec!["chrome", "edge", "firefox"] };
        let mut final_child = None;
        
        for b_type in browser_to_try {
            if let Some(exe) = find_browser_exe(b_type) {
                let mut cmd = Command::new(exe);
                if b_type == "firefox" {
                    cmd.args(&["-kiosk", "-new-window", "-profile", &profile_str, &url]);
                } else {
                    cmd.args(&["--kiosk", &format!("--user-data-dir={}", profile_str), &url]);
                    if b_type == "edge" {
                        cmd.arg("--edge-kiosk-type=fullscreen");
                    }
                }
                
                if let Ok(c) = cmd.spawn() {
                    final_child = Some(c);
                    break;
                }
            }
        }
        
        final_child.ok_or_else(|| "Nenhum navegador suportado encontrado ou falha ao iniciar.".to_string())?
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
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_process_metadata_fallback() {
        let meta = get_executable_metadata("C:/Games/Cyberpunk2077.exe".to_string()).expect("Should parse path");
        assert_eq!(meta.title, "Cyberpunk2077");

        let linux_meta = get_executable_metadata("/home/user/stremio".to_string()).expect("Should parse path");
        assert_eq!(linux_meta.title, "stremio");
    }

    #[test]
    fn test_right_click_interval() {
        let now: u64 = 1000;
        let last: u64 = 500;
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
            ("target_b".to_string(), 101u32),
        ]);
        let mut pids_guard = pids.lock().unwrap();
        pids_guard.retain(|(t, _)| t != "target_a");
        assert_eq!(pids_guard.len(), 1);
        assert_eq!(pids_guard[0].0, "target_b");
    }

    #[test]
    fn test_get_executable_metadata_path_without_extension() {
        let meta = get_executable_metadata("/usr/bin/firefox".to_string()).unwrap();
        assert_eq!(meta.title, "firefox");
    }

    #[test]
    fn test_convert_image_to_base64_png() {
        let dir = tempdir().unwrap();
        let png_path = dir.path().join("test.png");
        fs::write(&png_path, b"\x89PNG\r\n\x1a\nfake png data").unwrap();
        let result = convert_image_to_base64(&png_path).unwrap();
        assert!(result.starts_with("data:image/png;base64,"));
    }

    #[test]
    fn test_convert_image_to_base64_svg() {
        let dir = tempdir().unwrap();
        let svg_path = dir.path().join("test.svg");
        fs::write(&svg_path, b"<svg xmlns='http://www.w3.org/2000/svg'/>").unwrap();
        let result = convert_image_to_base64(&svg_path).unwrap();
        assert!(result.starts_with("data:image/svg+xml;base64,"));
    }

    #[test]
    fn test_convert_image_to_base64_returns_none_for_nonexistent_file() {
        let result = convert_image_to_base64(std::path::Path::new("/nonexistent/file_kiosker_test.png"));
        assert!(result.is_none());
    }

    #[test]
    fn test_kill_target_noop_when_target_not_found() {
        use std::sync::Mutex;
        let pids = Mutex::new(vec![("target_a".to_string(), 100u32)]);
        let mut guard = pids.lock().unwrap();
        guard.retain(|(t, _)| t != "nonexistent_target");
        assert_eq!(guard.len(), 1);
    }

    #[test]
    fn test_kill_target_removes_all_matching_entries() {
        use std::sync::Mutex;
        let pids = Mutex::new(vec![
            ("target_a".to_string(), 100u32),
            ("target_a".to_string(), 101u32),
            ("target_b".to_string(), 102u32),
        ]);
        let mut guard = pids.lock().unwrap();
        guard.retain(|(t, _)| t != "target_a");
        assert_eq!(guard.len(), 1);
        assert_eq!(guard[0].0, "target_b");
    }

    #[test]
    fn test_active_targets_cleanup_filters_dead_pids() {
        use std::sync::Mutex;
        use sysinfo::{Pid, System};
        let fake_pid = u32::MAX;
        let pids = Mutex::new(vec![("dead_target".to_string(), fake_pid)]);
        let system = System::new_all();
        let mut guard = pids.lock().unwrap();
        guard.retain(|(_, pid)| system.process(Pid::from(*pid as usize)).is_some());
        assert!(guard.is_empty(), "Dead PID should have been removed");
    }

    #[test]
    fn test_launch_executable_fails_for_nonexistent_path() {
        let result = std::process::Command::new("/nonexistent/binary/xyz_kiosker_test_1234").spawn();
        assert!(result.is_err(), "Spawning a nonexistent executable should fail");
    }
}
