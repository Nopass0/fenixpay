use crate::device::{DeviceManager, DeviceApiClient, ConnectDeviceRequest, NotificationRequest, DevicePingService};
use crate::models::Config;
use anyhow::Result;
use dialoguer::{theme::ColorfulTheme, Input, Select};
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::Utc;

pub enum DeviceMenuItem {
    CreateDevice,
    ListDevices,
    ConnectDevice,
    ConnectAll,
    DisconnectDevice,
    SendNotification,
    LinkToTrader,
    UpdateDeviceInfo,
    Back,
}

impl std::fmt::Display for DeviceMenuItem {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DeviceMenuItem::CreateDevice => write!(f, "Create New Device"),
            DeviceMenuItem::ListDevices => write!(f, "List All Devices"),
            DeviceMenuItem::ConnectDevice => write!(f, "Connect Device"),
            DeviceMenuItem::ConnectAll => write!(f, "Connect All Devices"),
            DeviceMenuItem::DisconnectDevice => write!(f, "Disconnect Device"),
            DeviceMenuItem::SendNotification => write!(f, "Send Test Notification"),
            DeviceMenuItem::LinkToTrader => write!(f, "Link Device to Trader"),
            DeviceMenuItem::UpdateDeviceInfo => write!(f, "Update Device Info"),
            DeviceMenuItem::Back => write!(f, "Back to Main Menu"),
        }
    }
}

pub struct DeviceMenu {
    device_manager: Arc<DeviceManager>,
    api_client: Arc<DeviceApiClient>,
    ping_service: Arc<DevicePingService>,
    config: Arc<RwLock<Config>>,
}

impl DeviceMenu {
    pub fn new(
        config: Arc<RwLock<Config>>,
        device_manager: Arc<DeviceManager>,
        api_client: Arc<DeviceApiClient>,
        ping_service: Arc<DevicePingService>
    ) -> Self {
        Self {
            device_manager,
            api_client,
            ping_service,
            config,
        }
    }

    pub async fn run(&self) -> Result<()> {
        loop {
            let items = vec![
                DeviceMenuItem::CreateDevice,
                DeviceMenuItem::ListDevices,
                DeviceMenuItem::ConnectDevice,
                DeviceMenuItem::ConnectAll,
                DeviceMenuItem::DisconnectDevice,
                DeviceMenuItem::SendNotification,
                DeviceMenuItem::LinkToTrader,
                DeviceMenuItem::UpdateDeviceInfo,
                DeviceMenuItem::Back,
            ];

            let selection = Select::with_theme(&ColorfulTheme::default())
                .with_prompt("Device Emulator")
                .items(&items)
                .default(0)
                .interact()?;

            match items[selection] {
                DeviceMenuItem::CreateDevice => self.create_device().await?,
                DeviceMenuItem::ListDevices => self.list_devices(),
                DeviceMenuItem::ConnectDevice => self.connect_device().await?,
                DeviceMenuItem::ConnectAll => self.connect_all_devices().await?,
                DeviceMenuItem::DisconnectDevice => self.disconnect_device().await?,
                DeviceMenuItem::SendNotification => self.send_notification().await?,
                DeviceMenuItem::LinkToTrader => self.link_to_trader().await?,
                DeviceMenuItem::UpdateDeviceInfo => self.update_device_info().await?,
                DeviceMenuItem::Back => {
                    // Don't stop ping services - they should continue running
                    break;
                }
            }
        }

        Ok(())
    }

    async fn create_device(&self) -> Result<()> {
        let name = Input::<String>::with_theme(&ColorfulTheme::default())
            .with_prompt("Device name")
            .default("My Test Device".to_string())
            .interact()?;

        let device = self.device_manager.create_device(name).await?;
        
        println!("\n✅ Device created successfully!");
        println!("ID: {}", device.id);
        println!("Name: {}", device.name);
        println!("Model: {}", device.device_model);
        println!("Android Version: {}", device.android_version);
        println!("Battery Level: {}%", device.battery_level);
        
        Ok(())
    }

    fn list_devices(&self) {
        let devices = self.device_manager.get_all_devices();
        
        if devices.is_empty() {
            println!("\n❌ No devices found");
            return;
        }

        println!("\n📱 Available Devices:");
        println!("{:-<80}", "");
        
        // Get active ping count
        let active_pings = tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                self.ping_service.get_active_ping_count().await
            })
        });
        
        println!("Total devices: {} | Active ping services: {}", devices.len(), active_pings);
        println!("{:-<80}", "");
        
        for device in devices {
            println!("ID: {}", device.id);
            println!("Name: {}", device.name);
            println!("Status: {}", if device.is_connected { "🟢 Connected" } else { "🔴 Disconnected" });
            if let Some(trader_id) = &device.trader_id {
                println!("Trader ID: {}", trader_id);
            }
            println!("Battery: {}%", device.battery_level);
            println!("Network: {}", device.network_info);
            if let Some(last_active) = device.last_active_at {
                let seconds_ago = (Utc::now() - last_active).num_seconds();
                println!("Last active: {} seconds ago", seconds_ago);
            }
            println!("{:-<80}", "");
        }
    }

    async fn connect_device(&self) -> Result<()> {
        let devices = self.device_manager.get_all_devices();
        let disconnected_devices: Vec<_> = devices.iter()
            .filter(|d| !d.is_connected)
            .collect();

        if disconnected_devices.is_empty() {
            println!("\n❌ No disconnected devices available");
            return Ok(());
        }

        let device_names: Vec<String> = disconnected_devices.iter()
            .map(|d| format!("{} ({})", d.name, d.id))
            .collect();

        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Select device to connect")
            .items(&device_names)
            .interact()?;

        let device = &disconnected_devices[selection];
        
        let device_code = Input::<String>::with_theme(&ColorfulTheme::default())
            .with_prompt("Enter device code")
            .interact()?;

        // Prepare connection request
        let request = ConnectDeviceRequest {
            device_code: device_code.clone(),
            battery_level: device.battery_level,
            network_info: device.network_info.clone(),
            device_model: device.device_model.clone(),
            android_version: device.android_version.clone(),
            app_version: device.app_version.clone(),
        };

        println!("\n🔄 Connecting device...");

        match self.api_client.connect_device(request).await {
            Ok(response) => {
                if let Some(token) = response.token {
                    self.device_manager.connect_device(&device.id, device_code, token).await?;
                    println!("✅ Device connected successfully!");
                    println!("Message: {}", response.message);
                    
                    // Start ping service for the device
                    println!("🔄 Starting ping service...");
                    if let Err(e) = self.ping_service.start_ping_for_device(device.id.clone()).await {
                        println!("⚠️  Warning: Failed to start ping service: {}", e);
                    } else {
                        println!("✅ Ping service started (health check every 20ms)");
                    }
                } else {
                    println!("❌ Connection failed: {}", response.message);
                }
            }
            Err(e) => {
                println!("❌ Failed to connect device: {}", e);
            }
        }

        Ok(())
    }

    async fn connect_all_devices(&self) -> Result<()> {
        let devices = self.device_manager.get_disconnected_devices_with_code();
        
        if devices.is_empty() {
            println!("\n❌ No disconnected devices with saved codes available");
            return Ok(());
        }

        println!("\n🔄 Connecting {} devices...", devices.len());
        
        let mut connected_count = 0;
        let mut failed_count = 0;
        
        for device in devices {
            if let Some(device_code) = device.device_code.clone() {
                let request = ConnectDeviceRequest {
                    device_code: device_code.clone(),
                    battery_level: device.battery_level,
                    network_info: device.network_info.clone(),
                    device_model: device.device_model.clone(),
                    android_version: device.android_version.clone(),
                    app_version: device.app_version.clone(),
                };

                match self.api_client.connect_device(request).await {
                    Ok(response) => {
                        if let Some(token) = response.token {
                            if let Err(e) = self.device_manager.connect_device(&device.id, device_code, token).await {
                                println!("❌ Failed to update device {}: {}", device.name, e);
                                failed_count += 1;
                                continue;
                            }
                            
                            // Start ping service
                            if let Err(e) = self.ping_service.start_ping_for_device(device.id.clone()).await {
                                println!("⚠️  Failed to start ping for {}: {}", device.name, e);
                            }
                            
                            connected_count += 1;
                            println!("✅ Connected: {}", device.name);
                        } else {
                            failed_count += 1;
                            println!("❌ Failed: {} - {}", device.name, response.message);
                        }
                    }
                    Err(e) => {
                        failed_count += 1;
                        println!("❌ Failed: {} - {}", device.name, e);
                    }
                }
            }
        }
        
        println!("\n📊 Results:");
        println!("✅ Connected: {}", connected_count);
        println!("❌ Failed: {}", failed_count);
        
        Ok(())
    }

    async fn disconnect_device(&self) -> Result<()> {
        let devices = self.device_manager.get_all_devices();
        let connected_devices: Vec<_> = devices.iter()
            .filter(|d| d.is_connected)
            .collect();

        if connected_devices.is_empty() {
            println!("\n❌ No connected devices available");
            return Ok(());
        }

        let device_names: Vec<String> = connected_devices.iter()
            .map(|d| format!("{} ({})", d.name, d.id))
            .collect();

        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Select device to disconnect")
            .items(&device_names)
            .interact()?;

        let device = &connected_devices[selection];
        
        // Stop ping service first
        if let Err(e) = self.ping_service.stop_ping_for_device(&device.id).await {
            println!("⚠️  Warning: Failed to stop ping service: {}", e);
        }
        
        self.device_manager.disconnect_device(&device.id).await?;
        println!("\n✅ Device disconnected successfully!");

        Ok(())
    }

    async fn send_notification(&self) -> Result<()> {
        let devices = self.device_manager.get_all_devices();
        let connected_devices: Vec<_> = devices.iter()
            .filter(|d| d.is_connected)
            .collect();

        if connected_devices.is_empty() {
            println!("\n❌ No connected devices available");
            return Ok(());
        }

        let device_names: Vec<String> = connected_devices.iter()
            .map(|d| format!("{} ({})", d.name, d.id))
            .collect();

        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Select device")
            .items(&device_names)
            .interact()?;

        let device = &connected_devices[selection];

        // Simulate bank notification
        let banks = vec![
            "Sberbank", 
            "Tinkoff", 
            "Alfa Bank", 
            "VTB",
            "Gazprombank",
            "Ozon Bank",
            "OTP Bank",
            "PSB",
            "DOM.RF",
            "MTS Bank",
            "UralSib",
            "Raiffeisen",
            "Pochta Bank",
            "Bank SPB",
            "RNKB",
            "RSHB",
            "Home Credit"
        ];
        let bank_selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Select bank")
            .items(&banks)
            .interact()?;

        let amount = Input::<f64>::with_theme(&ColorfulTheme::default())
            .with_prompt("Transaction amount")
            .default(1000.0)
            .interact()?;

        // Use the device notification service to send bank-specific notification
        match self.device_notification_service.send_test_notification(
            &device.id,
            banks[bank_selection],
            amount
        ).await {
            Ok(_) => println!("✅ Notification sent successfully!"),
            Err(e) => println!("❌ Failed to send notification: {}", e),
        }

        Ok(())
    }

    async fn link_to_trader(&self) -> Result<()> {
        let devices = self.device_manager.get_all_devices();
        
        if devices.is_empty() {
            println!("\n❌ No devices available");
            return Ok(());
        }

        let device_names: Vec<String> = devices.iter()
            .map(|d| format!("{} ({})", d.name, d.id))
            .collect();

        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Select device")
            .items(&device_names)
            .interact()?;

        let device = &devices[selection];

        let trader_id = Input::<String>::with_theme(&ColorfulTheme::default())
            .with_prompt("Enter trader ID")
            .interact()?;

        self.device_manager.link_device_to_trader(&device.id, &trader_id).await?;
        println!("\n✅ Device linked to trader successfully!");

        Ok(())
    }

    async fn update_device_info(&self) -> Result<()> {
        let devices = self.device_manager.get_all_devices();
        let connected_devices: Vec<_> = devices.iter()
            .filter(|d| d.is_connected)
            .collect();

        if connected_devices.is_empty() {
            println!("\n❌ No connected devices available");
            return Ok(());
        }

        let device_names: Vec<String> = connected_devices.iter()
            .map(|d| format!("{} ({})", d.name, d.id))
            .collect();

        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Select device")
            .items(&device_names)
            .interact()?;

        let device = &connected_devices[selection];

        let battery_level = Input::<u8>::with_theme(&ColorfulTheme::default())
            .with_prompt("Battery level (%)")
            .default(device.battery_level)
            .validate_with(|input: &u8| {
                if *input <= 100 {
                    Ok(())
                } else {
                    Err("Battery level must be between 0 and 100")
                }
            })
            .interact()?;

        let network_types = vec!["Wi-Fi", "4G", "5G", "3G", "Edge"];
        let network_selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Network type")
            .items(&network_types)
            .default(0)
            .interact()?;

        let network_info = network_types[network_selection].to_string();

        // Update local state
        self.device_manager.update_device_status(&device.id, battery_level, network_info.clone()).await?;

        // Update on server if connected
        if let Some(token) = &device.token {
            println!("\n🔄 Updating device info on server...");
            
            match self.api_client.update_device_info(token, battery_level, 100).await {
                Ok(_) => println!("✅ Device info updated successfully!"),
                Err(e) => println!("❌ Failed to update device info: {}", e),
            }
        } else {
            println!("✅ Device info updated locally");
        }

        Ok(())
    }
}