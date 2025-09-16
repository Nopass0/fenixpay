mod api;
mod device;
mod models;
mod services;
mod ui;

use anyhow::Result;
use api::{ApiClient, CallbackServer};
use device::{DeviceManager, NotificationEmulator, DeviceApiClient};
use models::Config;
use services::{MerchantService, StorageService, StatisticsService, TrafficGenerator};
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use tracing::{error, info};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};
use ui::{MainMenu, MenuItem, MerchantMenu, MerchantMenuItem, TrafficMenu, LogViewer};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info"))
        )
        .init();

    info!("Starting Merchant Emulator");

    // Load configuration
    let config = Config::default();
    
    // Create directories
    tokio::fs::create_dir_all(&config.data_dir).await?;
    tokio::fs::create_dir_all(&config.export_dir).await?;

    // Initialize services
    let api_client = Arc::new(ApiClient::new(config.api_base_url.clone())?);
    let storage = Arc::new(StorageService::new(config.data_dir.clone()).await?);
    let stats_service = Arc::new(StatisticsService::new());
    
    let merchant_service = Arc::new(MerchantService::new(
        api_client.clone(),
        storage.clone(),
        stats_service.clone(),
    ));
    
    let traffic_generator = Arc::new(TrafficGenerator::new(merchant_service.clone()));
    
    // Create global device manager and ping service
    let device_manager = Arc::new(DeviceManager::new(config.data_dir.clone()));
    // Load saved devices
    device_manager.load_devices().await?;
    
    let device_api_client = Arc::new(DeviceApiClient::new(config.api_base_url.clone()));
    let ping_service = Arc::new(device::DevicePingService::new(
        device_manager.clone(),
        device_api_client.clone()
    ));
    
    // Restart ping services for connected devices
    for device in device_manager.get_all_devices() {
        if device.is_connected && device.token.is_some() {
            if let Err(e) = ping_service.start_ping_for_device(device.id.clone()).await {
                error!("Failed to restart ping for device {}: {}", device.id, e);
            }
        }
    }
    
    let _notification_emulator = Arc::new(RwLock::new(NotificationEmulator::new()));
    
    // Start callback server
    let callback_server = CallbackServer::new(config.callback_server_port);
    let _callback_sender = callback_server.get_sender();
    
    tokio::spawn(async move {
        if let Err(e) = callback_server.start().await {
            error!("Callback server error: {}", e);
        }
    });

    // Main application loop
    loop {
        MainMenu::clear_screen();
        
        match MainMenu::show()? {
            MenuItem::CreateMerchant => {
                let (name, api_key) = MainMenu::get_merchant_details()?;
                
                match merchant_service.create_merchant(name, api_key).await {
                    Ok(merchant) => {
                        MainMenu::show_success(&format!("Created merchant: {}", merchant.name));
                    }
                    Err(e) => {
                        MainMenu::show_error(&format!("Failed to create merchant: {}", e));
                    }
                }
            }
            
            MenuItem::SelectMerchant => {
                let merchants = storage.get_all_merchants();
                
                if merchants.is_empty() {
                    MainMenu::show_info("No merchants found. Please create one first.");
                    continue;
                }
                
                let names: Vec<String> = merchants.iter().map(|m| m.name.clone()).collect();
                
                let selection = dialoguer::Select::with_theme(&dialoguer::theme::ColorfulTheme::default())
                    .with_prompt("Select merchant")
                    .items(&names)
                    .interact()?;
                    
                let mut merchant = merchants[selection].clone();
                
                // Merchant submenu
                loop {
                    MainMenu::clear_screen();
                    
                    let traffic_info = traffic_generator.get_traffic_info(&merchant.id).await;
                    
                    match MerchantMenu::show(&merchant, traffic_info)? {
                        MerchantMenuItem::ConfigureTraffic => {
                            merchant.traffic_config = TrafficMenu::configure_traffic(&merchant.traffic_config)?;
                            merchant_service.update_merchant(merchant.clone()).await?;
                            MainMenu::show_success("Traffic configuration updated");
                        }
                        
                        MerchantMenuItem::StartTraffic => {
                            if !merchant.traffic_config.enabled {
                                merchant.traffic_config.enabled = true;
                                merchant_service.update_merchant(merchant.clone()).await?;
                            }
                            
                            // Get available methods from API
                            match merchant_service.get_available_methods(&merchant).await {
                                Ok(methods) => {
                                    if methods.is_empty() {
                                        MainMenu::show_error("No payment methods available for this merchant");
                                    } else {
                                        let method_id = MerchantMenu::select_method_from_list(&methods)?;
                                        
                                        // Create log channel for this merchant
                                        let _ = traffic_generator.create_log_channel(merchant.id).await;
                                        
                                        match traffic_generator.start_traffic(merchant.clone(), method_id, false).await {
                                            Ok(_) => MainMenu::show_success("Traffic generation started (with logs)"),
                                            Err(e) => MainMenu::show_error(&format!("Failed to start traffic: {}", e)),
                                        }
                                    }
                                }
                                Err(e) => {
                                    MainMenu::show_error(&format!("Failed to get payment methods: {}", e));
                                }
                            }
                        }
                        
                        MerchantMenuItem::StopTraffic => {
                            match traffic_generator.stop_traffic(&merchant.id).await {
                                Ok(_) => {
                                    merchant.traffic_config.enabled = false;
                                    merchant_service.update_merchant(merchant.clone()).await?;
                                    MainMenu::show_success("Traffic generation stopped");
                                }
                                Err(e) => MainMenu::show_error(&format!("Failed to stop traffic: {}", e)),
                            }
                        }
                        
                        MerchantMenuItem::ViewTransactions => {
                            let transactions = storage.get_merchant_transactions(&merchant.id);
                            
                            if transactions.is_empty() {
                                MainMenu::show_info("No transactions found");
                            } else {
                                println!("\nLast 10 transactions:");
                                for (i, tx) in transactions.iter().rev().take(10).enumerate() {
                                    println!("{}. Order: {} | Amount: {} | Status: {} | Error: {}",
                                        i + 1,
                                        tx.transaction.order_id,
                                        tx.transaction.amount,
                                        if tx.error.is_some() { "Failed" } else { "Success" },
                                        tx.error.as_ref().unwrap_or(&"None".to_string())
                                    );
                                }
                                
                                println!("\nPress Enter to continue...");
                                let _ = std::io::stdin().read_line(&mut String::new());
                            }
                        }
                        
                        MerchantMenuItem::ViewStatistics => {
                            if let Some(stats) = stats_service.get_statistics(&merchant.id) {
                                println!("\nStatistics for {}:", merchant.name);
                                println!("  Total requests: {}", stats.total_requests);
                                println!("  Successful: {}", stats.successful_requests);
                                println!("  Failed: {}", stats.failed_requests);
                                println!("  Success rate: {:.2}%", 
                                    if stats.total_requests > 0 {
                                        (stats.successful_requests as f64 / stats.total_requests as f64) * 100.0
                                    } else { 0.0 }
                                );
                                println!("  Total amount: {} RUB", stats.total_amount);
                                println!("  Callbacks received: {}", stats.callbacks_received);
                                println!("  Liquid transactions: {}", stats.liquid_transactions);
                                println!("  Non-liquid transactions: {}", stats.non_liquid_transactions);
                                
                                if !stats.error_breakdown.is_empty() {
                                    println!("\n  Error breakdown:");
                                    for (error, count) in &stats.error_breakdown {
                                        println!("    {}: {}", error, count);
                                    }
                                }
                                
                                if !stats.status_breakdown.is_empty() {
                                    println!("\n  Status breakdown:");
                                    for (status, count) in &stats.status_breakdown {
                                        println!("    {}: {}", status, count);
                                    }
                                }
                                
                                println!("\nPress Enter to continue...");
                                let _ = std::io::stdin().read_line(&mut String::new());
                            } else {
                                MainMenu::show_info("No statistics available");
                            }
                        }
                        
                        MerchantMenuItem::ExportData => {
                            match merchant_service.export_merchant_data(&merchant.id, &config.export_dir).await {
                                Ok((history_path, stats_path)) => {
                                    MainMenu::show_success(&format!(
                                        "Data exported:\n  History: {:?}\n  Statistics: {:?}",
                                        history_path, stats_path
                                    ));
                                }
                                Err(e) => MainMenu::show_error(&format!("Export failed: {}", e)),
                            }
                        }
                        
                        MerchantMenuItem::ConfigureCallback => {
                            merchant.callback_url = MerchantMenu::get_callback_url()?;
                            merchant_service.update_merchant(merchant.clone()).await?;
                            MainMenu::show_success("Callback URL updated");
                        }
                        
                        MerchantMenuItem::TogglePaymentType => {
                            merchant.payment_type = match merchant.payment_type {
                                models::PaymentType::Rub => {
                                    merchant.rate = Some(MerchantMenu::get_usdt_rate()?);
                                    models::PaymentType::UsdtTrc20
                                }
                                models::PaymentType::UsdtTrc20 => {
                                    merchant.rate = None;
                                    models::PaymentType::Rub
                                }
                            };
                            merchant_service.update_merchant(merchant.clone()).await?;
                            MainMenu::show_success(&format!("Payment type changed to {:?}", merchant.payment_type));
                        }
                        
                        MerchantMenuItem::SetLiquidity => {
                            merchant.liquidity_percentage = MerchantMenu::get_liquidity_percentage()?;
                            merchant_service.update_merchant(merchant.clone()).await?;
                            MainMenu::show_success(&format!("Liquidity set to {}%", merchant.liquidity_percentage));
                        }
                        
                        MerchantMenuItem::StartTrafficQuiet => {
                            if !merchant.traffic_config.enabled {
                                merchant.traffic_config.enabled = true;
                                merchant_service.update_merchant(merchant.clone()).await?;
                            }
                            
                            // Get available methods from API
                            match merchant_service.get_available_methods(&merchant).await {
                                Ok(methods) => {
                                    if methods.is_empty() {
                                        MainMenu::show_error("No payment methods available for this merchant");
                                    } else {
                                        let method_id = MerchantMenu::select_method_from_list(&methods)?;
                                        
                                        match traffic_generator.start_traffic(merchant.clone(), method_id, true).await {
                                            Ok(_) => MainMenu::show_success("Traffic generation started (quiet mode)"),
                                            Err(e) => MainMenu::show_error(&format!("Failed to start traffic: {}", e)),
                                        }
                                    }
                                }
                                Err(e) => {
                                    MainMenu::show_error(&format!("Failed to get payment methods: {}", e));
                                }
                            }
                        }
                        
                        MerchantMenuItem::ViewLogs => {
                            // Check if traffic is running with logs
                            if let Some((is_running, is_quiet)) = traffic_info {
                                if is_running && !is_quiet {
                                    MainMenu::show_info("Starting log viewer. Press 'q' or ESC to exit.");
                                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                                    
                                    // Create a new log channel that will receive logs from the traffic generator
                                    let log_rx = traffic_generator.create_log_channel(merchant.id).await;
                                    
                                    let _ = LogViewer::view_logs(log_rx).await;
                                    
                                    // Remove the log channel when done viewing
                                    traffic_generator.remove_log_channel(&merchant.id).await;
                                } else if is_running && is_quiet {
                                    MainMenu::show_error("Traffic is running in quiet mode. No logs available.");
                                } else {
                                    MainMenu::show_error("No active traffic for this merchant");
                                }
                            } else {
                                MainMenu::show_error("No active traffic for this merchant");
                            }
                        }
                        
                        MerchantMenuItem::Back => break,
                    }
                }
            }
            
            MenuItem::ViewStatistics => {
                let all_stats = stats_service.get_all_statistics();
                
                if all_stats.is_empty() {
                    MainMenu::show_info("No statistics available");
                } else {
                    println!("\nGlobal Statistics:");
                    
                    let mut total_requests = 0u64;
                    let mut total_successful = 0u64;
                    let mut total_failed = 0u64;
                    let mut total_amount = 0.0;
                    
                    for (merchant_id, stats) in &all_stats {
                        if let Some(merchant) = storage.get_merchant(merchant_id) {
                            println!("\n  {}:", merchant.name);
                            println!("    Requests: {} (Success: {}, Failed: {})",
                                stats.total_requests, stats.successful_requests, stats.failed_requests);
                            println!("    Amount: {} RUB", stats.total_amount);
                            
                            total_requests += stats.total_requests;
                            total_successful += stats.successful_requests;
                            total_failed += stats.failed_requests;
                            total_amount += stats.total_amount;
                        }
                    }
                    
                    println!("\n  Totals:");
                    println!("    Requests: {} (Success: {}, Failed: {})",
                        total_requests, total_successful, total_failed);
                    println!("    Success rate: {:.2}%",
                        if total_requests > 0 {
                            (total_successful as f64 / total_requests as f64) * 100.0
                        } else { 0.0 }
                    );
                    println!("    Total amount: {} RUB", total_amount);
                    
                    println!("\nPress Enter to continue...");
                    let _ = std::io::stdin().read_line(&mut String::new());
                }
            }
            
            MenuItem::ExportData => {
                MainMenu::show_info("Select merchant to export in the merchant menu");
            }
            
            MenuItem::DeviceEmulator => {
                if config.device_emulator_enabled {
                    let device_menu = ui::DeviceMenu::new(
                        Arc::new(RwLock::new(config.clone())),
                        device_manager.clone(),
                        device_api_client.clone(),
                        ping_service.clone()
                    );
                    if let Err(e) = device_menu.run().await {
                        MainMenu::show_error(&format!("Device emulator error: {}", e));
                    }
                } else {
                    MainMenu::show_info("Device emulator is disabled in configuration");
                }
            }
            
            MenuItem::Settings => {
                println!("\nCurrent Settings:");
                println!("  API URL: {}", config.api_base_url);
                println!("  Callback port: {}", config.callback_server_port);
                println!("  Data directory: {:?}", config.data_dir);
                println!("  Export directory: {:?}", config.export_dir);
                println!("  Device emulator: {}", if config.device_emulator_enabled { "Enabled" } else { "Disabled" });
                
                println!("\nPress Enter to continue...");
                let _ = std::io::stdin().read_line(&mut String::new());
            }
            
            MenuItem::Exit => {
                if MainMenu::confirm_action("Are you sure you want to exit?")? {
                    info!("Shutting down...");
                    traffic_generator.stop_all_traffic().await?;
                    storage.save_merchants().await?;
                    storage.save_transactions().await?;
                    storage.save_statistics().await?;
                    device_manager.save_devices().await?;
                    break;
                }
            }
        }
    }

    Ok(())
}