use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use std::time::Duration;

#[derive(Serialize, Deserialize, Clone)]
pub struct LocalExecMetadata {
    pub title: String,
    pub icon_url: Option<String>,
}

use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;

#[tauri::command]
pub fn get_executable_metadata(path: String) -> Result<LocalExecMetadata, String> {
    let p = Path::new(&path);
    let file_stem = p
        .file_stem()
        .unwrap_or_else(|| std::ffi::OsStr::new("Unknown App"))
        .to_string_lossy()
        .into_owned();

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

pub fn start_gamepad_listener(_app_handle: tauri::AppHandle) {
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
                    kill_kiosk_browsers();
                }
            }
            std::thread::sleep(Duration::from_millis(50));
        }
    });
}

pub fn start_global_mouse_listener() {
    use rdev::{listen, Button, Event, EventType};
    use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static RIGHT_CLICK_COUNT: AtomicUsize = AtomicUsize::new(0);
    static LAST_RIGHT_CLICK_TIME: AtomicU64 = AtomicU64::new(0);

    std::thread::spawn(|| {
        if let Err(error) = listen(|event: Event| {
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
                        kill_kiosk_browsers();
                    }
                }
                LAST_RIGHT_CLICK_TIME.store(now, Ordering::SeqCst);
            }
        }) {
            println!("Error listening to global mouse: {:?}", error);
        }
    });
}

pub fn kill_kiosk_browsers() {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("taskkill")
            .args(&["/F", "/IM", "chrome.exe"])
            .spawn();
        let _ = Command::new("taskkill")
            .args(&["/F", "/IM", "firefox.exe"])
            .spawn();
        let _ = Command::new("taskkill")
            .args(&["/F", "/IM", "msedge.exe"])
            .spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = Command::new("pkill").args(&["-f", "chrome"]).spawn();
        let _ = Command::new("pkill").args(&["-f", "firefox"]).spawn();
    }
}

#[tauri::command]
pub fn launch_executable(path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // Use cmd /C start to support .lnk, .iso, and other non-PE files
        Command::new("cmd")
            .args(&["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to launch {}: {}", path, e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new(&path)
            .spawn()
            .map_err(|e| format!("Failed to launch {}: {}", path, e))?;
    }

    Ok(format!("Launched {}", path))
}

#[tauri::command]
pub fn launch_kiosk(url: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // We'll try Firefox first. If it fails, we fall back to Chrome/Edge which might be accessible globally.
        // A more robust way is to read the registry, but simple sequential fallbacks work.
        // In "cmd /C start", relying on default browser is tricky to pass arguments like --kiosk

        // Using -new-window helps force a new window context without wiping existing sessions (like cookies for Netflix),
        // which makes -kiosk more reliable even if the user already has a normal Firefox session open.
        let default_cmd = Command::new("cmd")
            .args(&["/C", "start", "firefox", "-kiosk", "-new-window", &url])
            .spawn();

        if default_cmd.is_err() {
            // Fallback to chrome
            let _ = Command::new("cmd")
                .args(&["/C", "start", "chrome", "--kiosk", &url])
                .spawn();
        }
    }

    #[cfg(target_os = "linux")]
    {
        let cmd = Command::new("firefox").args(&["--kiosk", &url]).spawn();

        if cmd.is_err() {
            let _ = Command::new("google-chrome")
                .args(&["--kiosk", &url])
                .spawn();
        }
    }

    Ok("Launched kiosk".to_string())
}
