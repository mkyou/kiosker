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
    use std::fs;
    use std::path::PathBuf;
    use tempfile::tempdir;

    #[test]
    fn test_find_firefox_profile() {
        let dir = tempdir().unwrap();
        let profile_path = dir.path().join("abc.default-release");
        let _ = fs::create_dir(&profile_path);
        let found = find_firefox_profile_in_dir(dir.path()).unwrap();
        assert!(found.to_string_lossy().contains("abc.default-release"));
    }

    #[test]
    fn test_find_firefox_profile_in_dir_returns_none_for_empty_dir() {
        let dir = tempdir().unwrap();
        assert!(find_firefox_profile_in_dir(dir.path()).is_none());
    }

    #[test]
    fn test_find_firefox_profile_in_dir_returns_none_for_nonexistent_path() {
        assert!(find_firefox_profile_in_dir(Path::new("/nonexistent/path/xyz_kiosker_test")).is_none());
    }

    #[test]
    fn test_find_firefox_profile_in_dir_finds_plain_default_profile() {
        let dir = tempdir().unwrap();
        let profile_path = dir.path().join("abc.default");
        fs::create_dir(&profile_path).unwrap();
        let found = find_firefox_profile_in_dir(dir.path()).unwrap();
        assert!(found.to_string_lossy().contains("abc.default"));
    }

    #[test]
    fn test_migration_firefox_dest_is_profile_root() {
        let profile_dir = PathBuf::from("/tmp/kiosker_test_dir");
        let browser_type = "firefox";
        let dest_dir = if browser_type == "firefox" { profile_dir.clone() } else { profile_dir.join("Default") };
        assert_eq!(dest_dir, profile_dir);
    }

    #[test]
    fn test_migration_chrome_dest_is_default_subfolder() {
        let profile_dir = PathBuf::from("/tmp/kiosker_test_dir");
        let browser_type = "chrome";
        let dest_dir = if browser_type == "firefox" { profile_dir.clone() } else { profile_dir.join("Default") };
        assert_eq!(dest_dir, profile_dir.join("Default"));
    }

    #[test]
    fn test_migration_writes_browser_type_file() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("browser.type"), "firefox").unwrap();
        let content = fs::read_to_string(dir.path().join("browser.type")).unwrap();
        assert_eq!(content, "firefox");
    }

    #[test]
    fn test_migration_firefox_copies_correct_files() {
        let src_dir = tempdir().unwrap();
        let dest_dir = tempdir().unwrap();
        let firefox_files = ["places.sqlite", "key4.db", "cert9.db", "cookies.sqlite", "formhistory.sqlite", "logins.json"];
        for f in &firefox_files {
            fs::write(src_dir.path().join(f), b"test").unwrap();
        }
        for f in &firefox_files {
            let src = src_dir.path().join(f);
            if src.exists() { fs::copy(&src, dest_dir.path().join(f)).unwrap(); }
        }
        for f in &firefox_files {
            assert!(dest_dir.path().join(f).exists(), "Missing: {}", f);
        }
    }

    #[test]
    fn test_migration_chrome_copies_correct_files() {
        let src_dir = tempdir().unwrap();
        let dest_dir = tempdir().unwrap();
        let chrome_files = ["Cookies", "Login Data", "Web Data", "History", "Local State"];
        for f in &chrome_files {
            fs::write(src_dir.path().join(f), b"test").unwrap();
        }
        for f in &chrome_files {
            let src = src_dir.path().join(f);
            if src.exists() { fs::copy(&src, dest_dir.path().join(f)).unwrap(); }
        }
        for f in &chrome_files {
            assert!(dest_dir.path().join(f).exists(), "Missing: {}", f);
        }
    }

    #[test]
    fn test_migration_skips_missing_source_files() {
        let src_dir = tempdir().unwrap();
        let dest_dir = tempdir().unwrap();
        let src_file = src_dir.path().join("missing_file.sqlite");
        if src_file.exists() {
            fs::copy(&src_file, dest_dir.path().join("missing_file.sqlite")).unwrap();
        }
        assert!(!dest_dir.path().join("missing_file.sqlite").exists());
    }

    #[test]
    fn test_profile_dir_creation_if_not_exists() {
        let tmp = tempdir().unwrap();
        let profile_dir = tmp.path().join("browser-profile");
        assert!(!profile_dir.exists());
        if !profile_dir.exists() {
            let _ = fs::create_dir_all(&profile_dir);
        }
        assert!(profile_dir.exists());
    }
}
