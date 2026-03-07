use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SystemAppEntry {
    pub name: String,
    pub exec: String,
    pub icon: Option<String>,
    pub comment: Option<String>,
}

#[tauri::command]
pub fn get_system_apps() -> Result<Vec<SystemAppEntry>, String> {
    let mut apps = Vec::new();

    #[cfg(target_os = "linux")]
    {
        let search_paths = vec![
            "/usr/share/applications/",
            "/usr/local/share/applications/",
        ];

        if let Some(home) = std::env::var_os("HOME") {
            let user_apps = Path::new(&home).join(".local/share/applications/");
            if user_apps.exists() {
                scan_linux_dir_for_apps(user_apps, &mut apps);
            }
        }

        for path in search_paths {
            if Path::new(path).exists() {
                scan_linux_dir_for_apps(PathBuf::from(path), &mut apps);
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let mut win_paths = Vec::new();
        if let Some(program_data) = std::env::var_os("PROGRAMDATA") {
            win_paths.push(Path::new(&program_data).join("Microsoft\\Windows\\Start Menu\\Programs"));
        }
        if let Some(app_data) = std::env::var_os("APPDATA") {
            win_paths.push(Path::new(&app_data).join("Microsoft\\Windows\\Start Menu\\Programs"));
        }

        for path in win_paths {
            if path.exists() {
                scan_windows_dir_recursive(&path, &mut apps);
            }
        }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.name == b.name);
    
    Ok(apps)
}

#[cfg(target_os = "linux")]
fn scan_linux_dir_for_apps(path: PathBuf, apps: &mut Vec<SystemAppEntry>) {
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().map_or(false, |ext| ext == "desktop") {
                if let Some(app) = parse_desktop_file(&p) {
                    apps.push(app);
                }
            }
        }
    }
}

#[cfg(target_os = "windows")]
fn scan_windows_dir_recursive(path: &Path, apps: &mut Vec<SystemAppEntry>) {
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                scan_windows_dir_recursive(&p, apps);
            } else if p.extension().map_or(false, |ext| ext == "lnk" || ext == "exe") {
                let name = p.file_stem().unwrap_or_default().to_string_lossy().into_owned();
                apps.push(SystemAppEntry {
                    name,
                    exec: p.to_string_lossy().into_owned(),
                    icon: None, 
                    comment: None,
                });
            }
        }
    }
}

#[cfg(target_os = "linux")]
fn parse_desktop_file(path: &Path) -> Option<SystemAppEntry> {
    let content = fs::read_to_string(path).ok()?;
    let mut name = None;
    let mut exec = None;
    let mut icon = None;
    let mut comment = None;
    let mut in_desktop_entry = false;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed == "[Desktop Entry]" {
            in_desktop_entry = true;
            continue;
        } else if trimmed.starts_with('[') {
            in_desktop_entry = false;
        }

        if in_desktop_entry {
            if trimmed.starts_with("Name=") && name.is_none() {
                name = Some(trimmed.replace("Name=", ""));
            } else if trimmed.starts_with("Exec=") && exec.is_none() {
                let mut e = trimmed.replace("Exec=", "");
                e = e.split('%').next().unwrap_or(&e).trim().to_string();
                exec = Some(e);
            } else if trimmed.starts_with("Icon=") && icon.is_none() {
                icon = Some(trimmed.replace("Icon=", ""));
            } else if trimmed.starts_with("Comment=") && comment.is_none() {
                comment = Some(trimmed.replace("Comment=", ""));
            } else if trimmed.starts_with("NoDisplay=true") {
                return None;
            }
        }
    }

    if let (Some(n), Some(e)) = (name, exec) {
        Some(SystemAppEntry {
            name: n,
            exec: e,
            icon,
            comment,
        })
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;

    #[cfg(target_os = "linux")]
    #[test]
    fn test_parse_desktop_file() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.desktop");
        let mut file = File::create(&file_path).unwrap();
        writeln!(file, "[Desktop Entry]\nName=Kiosker Test\nExec=kiosker --debug %u\nIcon=kiosker-icon\nNoDisplay=false").unwrap();

        let app = parse_desktop_file(&file_path).expect("Should parse desktop file");
        assert_eq!(app.name, "Kiosker Test");
        assert_eq!(app.exec, "kiosker --debug"); // Should strip %u
        assert_eq!(app.icon, Some("kiosker-icon".to_string()));
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn test_parse_hidden_desktop_file() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("hidden.desktop");
        let mut file = File::create(&file_path).unwrap();
        writeln!(file, "[Desktop Entry]\nName=Hidden\nExec=hidden\nNoDisplay=true").unwrap();

        let app = parse_desktop_file(&file_path);
        assert!(app.is_none(), "Should ignore NoDisplay=true apps");
    }
}
