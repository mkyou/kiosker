use std::path::{Path, PathBuf};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

#[cfg(target_os = "windows")]
const CHROME_LOCAL_WIN: &str = "Google/Chrome/User Data/Default";
#[cfg(target_os = "windows")]
const EDGE_LOCAL_WIN: &str = "Microsoft/Edge/User Data/Default";
#[cfg(target_os = "linux")]
const CHROME_LOCAL_LINUX: &str = ".config/google-chrome/Default";
#[cfg(target_os = "windows")]
const FIREFOX_LOCAL_WIN: &str = "Mozilla/Firefox/Profiles";
#[cfg(target_os = "linux")]
const FIREFOX_LOCAL_LINUX: &str = ".mozilla/firefox";

pub fn get_kiosker_profile_dir(app_handle: &AppHandle) -> PathBuf {
    let app_dir = app_handle.path().app_config_dir().unwrap();
    let profile_dir = app_dir.join("browser-profile");
    if !profile_dir.exists() {
        let _ = fs::create_dir_all(&profile_dir);
    }
    profile_dir
}

pub fn find_default_browser_profile() -> Option<(PathBuf, &'static str)> {
    // 1. Prioritize Firefox (User Preference - Privacy)
    #[cfg(target_os = "windows")]
    if let Some(appdata) = std::env::var_os("APPDATA") {
        let path = Path::new(&appdata).join(FIREFOX_LOCAL_WIN);
        if let Some(p) = find_firefox_profile_in_dir(&path) { return Some((p, "firefox")); }
    }
    #[cfg(target_os = "linux")]
    if let Some(home) = std::env::var_os("HOME") {
        let path = Path::new(&home).join(FIREFOX_LOCAL_LINUX);
        if let Some(p) = find_firefox_profile_in_dir(&path) { return Some((p, "firefox")); }
    }

    // 2. Next: Chrome
    #[cfg(target_os = "windows")]
    if let Some(local_appdata) = std::env::var_os("LOCALAPPDATA") {
        let path = Path::new(&local_appdata).join(CHROME_LOCAL_WIN);
        if path.exists() { return Some((path, "chrome")); }
    }
    #[cfg(target_os = "linux")]
    if let Some(home) = std::env::var_os("HOME") {
        let path = Path::new(&home).join(CHROME_LOCAL_LINUX);
        if path.exists() { return Some((path, "chrome")); }
    }

    // 3. Last Fallback: Edge (Windows Default)
    #[cfg(target_os = "windows")]
    if let Some(local_appdata) = std::env::var_os("LOCALAPPDATA") {
        let path = Path::new(&local_appdata).join(EDGE_LOCAL_WIN);
        if path.exists() { return Some((path, "chrome")); } // Edge is Chromium-based, uses same file structure
    }

    None
}

fn find_firefox_profile_in_dir(path: &Path) -> Option<PathBuf> {
    if !path.exists() { return None; }
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                let name = p.to_string_lossy();
                if name.contains(".default-release") || name.contains(".default") {
                    return Some(p);
                }
            }
        }
    }
    None
}

#[tauri::command]
pub fn run_browser_migration(app_handle: AppHandle, browser_type: String) -> std::result::Result<(), String> {
    let profile_dir = get_kiosker_profile_dir(&app_handle);
    
    // Firefox puts files in the root of the profile folder.
    // Chromium-based browsers use a "Default" subfolder inside the User Data dir.
    let dest_dir = if browser_type == "firefox" {
        profile_dir.clone()
    } else {
        profile_dir.join("Default")
    };

    let _ = fs::create_dir_all(&dest_dir);
    let _ = fs::write(profile_dir.join("browser.type"), &browser_type);

    if let Some((source_dir, _)) = find_default_browser_profile_by_type(&browser_type) {
        let files = if browser_type == "firefox" {
            vec!["places.sqlite", "key4.db", "cert9.db", "cookies.sqlite", "formhistory.sqlite", "logins.json"]
        } else {
            vec!["Cookies", "Login Data", "Web Data", "History", "Local State"]
        };

        for f in files {
            let src = source_dir.join(f);
            if src.exists() { let _ = fs::copy(src, dest_dir.join(f)); }
        }
    }
    
    Ok(())
}

fn find_default_browser_profile_by_type(browser_type: &str) -> Option<(PathBuf, &'static str)> {
    if browser_type == "firefox" {
        #[cfg(target_os = "windows")]
        if let Some(appdata) = std::env::var_os("APPDATA") {
            let path = Path::new(&appdata).join(FIREFOX_LOCAL_WIN);
            if let Some(p) = find_firefox_profile_in_dir(&path) { return Some((p, "firefox")); }
        }
        #[cfg(target_os = "linux")]
        if let Some(home) = std::env::var_os("HOME") {
            let path = Path::new(&home).join(FIREFOX_LOCAL_LINUX);
            if let Some(p) = find_firefox_profile_in_dir(&path) { return Some((p, "firefox")); }
        }
    } else {
        // Try Chrome first
        #[cfg(target_os = "windows")]
        if let Some(local_appdata) = std::env::var_os("LOCALAPPDATA") {
            let path = Path::new(&local_appdata).join(CHROME_LOCAL_WIN);
            if path.exists() { return Some((path, "chrome")); }
            
            // Try Edge as fallback for Chromium
            let edge_path = Path::new(&local_appdata).join(EDGE_LOCAL_WIN);
            if edge_path.exists() { return Some((edge_path, "chrome")); }
        }
        #[cfg(target_os = "linux")]
        if let Some(home) = std::env::var_os("HOME") {
            let path = Path::new(&home).join(CHROME_LOCAL_LINUX);
            if path.exists() { return Some((path, "chrome")); }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_find_firefox_profile() {
        let dir = tempdir().unwrap();
        let profile_path = dir.path().join("abc.default-release");
        let _ = fs::create_dir(&profile_path);
        
        // Should find the folder containing '.default-release'
        let found = find_firefox_profile_in_dir(dir.path()).unwrap();
        assert!(found.to_string_lossy().contains("abc.default-release"));
    }
}
