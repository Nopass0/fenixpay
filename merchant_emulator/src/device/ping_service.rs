use anyhow::Result;
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};
use tokio::task::JoinHandle;
use tracing::info;
use crate::device::{DeviceManager, DeviceApiClient};

pub struct DevicePingService {
    device_manager: Arc<DeviceManager>,
    api_client: Arc<DeviceApiClient>,
    ping_tasks: Arc<RwLock<HashMap<String, JoinHandle<()>>>>,
}

impl DevicePingService {
    pub fn new(device_manager: Arc<DeviceManager>, api_client: Arc<DeviceApiClient>) -> Self {
        Self {
            device_manager,
            api_client,
            ping_tasks: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn start_ping_for_device(&self, device_id: String) -> Result<()> {
        // Stop existing ping task if any
        self.stop_ping_for_device(&device_id).await?;

        let device = self.device_manager.get_device(&device_id)
            .ok_or_else(|| anyhow::anyhow!("Device not found"))?;

        if !device.is_connected || device.token.is_none() {
            return Err(anyhow::anyhow!("Device is not connected"));
        }

        let token = device.token.unwrap();
        let device_manager = self.device_manager.clone();
        let api_client = self.api_client.clone();
        let device_id_clone = device_id.clone();

        info!("Starting ping service for device {}", device_id);

        // Start ping task - ping every 20ms
        let handle = tokio::spawn(async move {
            let mut interval = interval(Duration::from_millis(20));
            interval.tick().await; // Skip the first immediate tick

            loop {
                interval.tick().await;
                
                // Check if device still exists and connected
                let device = match device_manager.get_device(&device_id_clone) {
                    Some(d) if d.is_connected => d,
                    _ => {
                        break;
                    }
                };

                // Perform health check
                match api_client.health_check(&token, device.battery_level).await {
                    Ok(_) => {
                        // Update last active time
                        let _ = device_manager.update_device_status(
                            &device_id_clone,
                            device.battery_level,
                            device.network_info.clone()
                        ).await;
                    }
                    Err(_) => {
                        // Try simple ping as fallback
                        if let Err(_) = api_client.ping(Some(&token)).await {
                            // Disconnect device after failed ping
                            let _ = device_manager.disconnect_device(&device_id_clone).await;
                            break;
                        }
                    }
                }
            }
        });

        self.ping_tasks.write().await.insert(device_id, handle);
        Ok(())
    }

    pub async fn stop_ping_for_device(&self, device_id: &str) -> Result<()> {
        if let Some(handle) = self.ping_tasks.write().await.remove(device_id) {
            handle.abort();
            info!("Stopped ping service for device {}", device_id);
        }
        Ok(())
    }

    pub async fn stop_all_pings(&self) -> Result<()> {
        let mut tasks = self.ping_tasks.write().await;
        for (device_id, handle) in tasks.drain() {
            handle.abort();
            info!("Stopped ping service for device {}", device_id);
        }
        Ok(())
    }

    pub async fn get_active_ping_count(&self) -> usize {
        self.ping_tasks.read().await.len()
    }
}