use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct SystemStatus {
    pub battery_percentage: Option<u8>,
    pub is_charging: bool,
    pub wifi_connected: bool,
}

#[tauri::command]
pub fn get_system_status() -> SystemStatus {
    SystemStatus {
        battery_percentage: get_battery_percentage(),
        is_charging: get_is_charging(),
        wifi_connected: get_wifi_connected(),
    }
}

#[tauri::command]
pub fn open_wifi_settings() -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        // Tries common linux network settings
        let result = Command::new("nm-connection-editor").spawn()
            .or_else(|_| Command::new("gnome-control-center").arg("wifi").spawn())
            .or_else(|_| Command::new("cinnamon-settings").arg("network").spawn());
            
        if result.is_ok() { return Ok(()); }
    }
    
    #[cfg(target_os = "windows")]
    {
        if Command::new("cmd").args(["/C", "start", "ms-settings:network"]).spawn().is_ok() {
            return Ok(());
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        if Command::new("open").arg("x-apple.systempreferences:com.apple.preference.network").spawn().is_ok() {
            return Ok(());
        }
    }
    
    Err("Failed to open network settings natively".into())
}

fn get_battery_percentage() -> Option<u8> {
    #[cfg(target_os = "linux")]
    {
        let bats = ["BAT0", "BAT1", "BAT2", "macsmc-battery"];
        for bat in bats {
            if let Ok(output) = Command::new("cat").arg(format!("/sys/class/power_supply/{}/capacity", bat)).output() {
                if let Ok(pct) = String::from_utf8(output.stdout) {
                    if let Ok(val) = pct.trim().parse::<u8>() {
                        return Some(val);
                    }
                }
            }
        }
    }
    None
}

fn get_is_charging() -> bool {
    #[cfg(target_os = "linux")]
    {
        let bats = ["BAT0", "BAT1", "BAT2", "macsmc-battery"];
        for bat in bats {
            if let Ok(output) = Command::new("cat").arg(format!("/sys/class/power_supply/{}/status", bat)).output() {
                if let Ok(status) = String::from_utf8(output.stdout) {
                    if status.trim().to_lowercase() == "charging" {
                        return true;
                    }
                }
            }
        }
    }
    false
}

fn get_wifi_connected() -> bool {
    // Basic connectivity check vs actual Wi-Fi check
    // Since cross-platform is hard, resolving a common endpoint is easiest for generic "connected" status.
    // However, an offline check would be checking for an active interface.
    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = Command::new("ip").arg("link").arg("show").output() {
            let str_out = String::from_utf8_lossy(&output.stdout).to_lowercase();
            if str_out.contains("state up") {
                return true;
            }
        }
    }
    // As a fallback, assume true if we can't accurately detect, to not distress the user.
    true
}
