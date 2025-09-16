use crate::models::Device;
use anyhow::Result;
use std::collections::HashMap;
use parking_lot::RwLock;
use std::sync::Arc;
use uuid::Uuid;
use chrono::Utc;
use std::path::PathBuf;
use tokio::fs;

pub struct DeviceManager {
    devices: Arc<RwLock<HashMap<String, Device>>>,
    data_dir: PathBuf,
}

impl DeviceManager {
    pub fn new(data_dir: PathBuf) -> Self {
        Self {
            devices: Arc::new(RwLock::new(HashMap::new())),
            data_dir,
        }
    }
    
    pub async fn load_devices(&self) -> Result<()> {
        let path = self.data_dir.join("devices.json");
        
        if path.exists() {
            let data = fs::read_to_string(&path).await?;
            let devices: HashMap<String, Device> = serde_json::from_str(&data)?;
            *self.devices.write() = devices;
        }
        
        Ok(())
    }
    
    pub async fn save_devices(&self) -> Result<()> {
        let path = self.data_dir.join("devices.json");
        let data = {
            let devices = self.devices.read();
            serde_json::to_string_pretty(&*devices)?
        };
        fs::write(&path, data).await?;
        Ok(())
    }
    
    pub async fn create_device(&self, name: String) -> Result<Device> {
        let device = Device {
            id: Uuid::new_v4().to_string(),
            name,
            device_code: None,
            token: None,
            trader_id: None,
            is_connected: false,
            battery_level: 85,
            network_info: "Wi-Fi".to_string(),
            device_model: "Google Pixel 7".to_string(),
            android_version: "13".to_string(),
            app_version: "1.0.0".to_string(),
            created_at: Utc::now(),
            last_active_at: None,
        };
        
        self.devices.write().insert(device.id.clone(), device.clone());
        self.save_devices().await?;
        Ok(device)
    }
    
    pub fn get_device(&self, id: &str) -> Option<Device> {
        self.devices.read().get(id).cloned()
    }
    
    pub fn get_all_devices(&self) -> Vec<Device> {
        self.devices.read().values().cloned().collect()
    }
    
    pub async fn connect_device(&self, id: &str, device_code: String, token: String) -> Result<()> {
        {
            let mut devices = self.devices.write();
            if let Some(device) = devices.get_mut(id) {
                device.device_code = Some(device_code);
                device.token = Some(token);
                device.is_connected = true;
                device.last_active_at = Some(Utc::now());
            } else {
                return Err(anyhow::anyhow!("Device not found"));
            }
        }
        self.save_devices().await?;
        Ok(())
    }
    
    pub async fn disconnect_device(&self, id: &str) -> Result<()> {
        {
            let mut devices = self.devices.write();
            if let Some(device) = devices.get_mut(id) {
                device.is_connected = false;
                // Сохраняем токен и код для повторного подключения
                // device.token = None;
            } else {
                return Err(anyhow::anyhow!("Device not found"));
            }
        }
        self.save_devices().await?;
        Ok(())
    }
    
    pub async fn link_device_to_trader(&self, device_id: &str, trader_id: &str) -> Result<()> {
        {
            let mut devices = self.devices.write();
            if let Some(device) = devices.get_mut(device_id) {
                device.trader_id = Some(trader_id.to_string());
            } else {
                return Err(anyhow::anyhow!("Device not found"));
            }
        }
        self.save_devices().await?;
        Ok(())
    }
    
    pub fn get_connected_devices_for_trader(&self, trader_id: &str) -> Vec<Device> {
        self.devices
            .read()
            .values()
            .filter(|d| d.trader_id.as_ref().map(|t| t == trader_id).unwrap_or(false) && d.is_connected)
            .cloned()
            .collect()
    }
    
    pub async fn update_device_status(&self, id: &str, battery_level: u8, network_info: String) -> Result<()> {
        {
            let mut devices = self.devices.write();
            if let Some(device) = devices.get_mut(id) {
                device.battery_level = battery_level;
                device.network_info = network_info;
                device.last_active_at = Some(Utc::now());
            } else {
                return Err(anyhow::anyhow!("Device not found"));
            }
        }
        // Не сохраняем каждый раз при обновлении статуса (слишком часто)
        Ok(())
    }
    
    pub fn get_disconnected_devices_with_code(&self) -> Vec<Device> {
        self.devices
            .read()
            .values()
            .filter(|d| !d.is_connected && d.device_code.is_some())
            .cloned()
            .collect()
    }
}