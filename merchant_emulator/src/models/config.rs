use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub api_base_url: String,
    pub callback_server_port: u16,
    pub data_dir: PathBuf,
    pub export_dir: PathBuf,
    pub log_level: String,
    pub device_emulator_enabled: bool,
}

impl Default for Config {
    fn default() -> Self {
        // Check for environment variables first, then use fallback directories
        let data_dir = if let Ok(dir) = std::env::var("MERCHANT_DATA_DIR") {
            PathBuf::from(dir)
        } else {
            // Use home directory instead of system data directory
            dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join(".merchant-emulator")
                .join("data")
        };
        
        let export_dir = if let Ok(dir) = std::env::var("MERCHANT_EXPORT_DIR") {
            PathBuf::from(dir)
        } else {
            // Use home directory instead of Downloads which has permission issues
            dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join(".merchant-emulator")
                .join("exports")
        };
        
        Self {
            api_base_url: "http://localhost:3000".to_string(),
            callback_server_port: 8080,
            data_dir,
            export_dir,
            log_level: "info".to_string(),
            device_emulator_enabled: true,
        }
    }
}