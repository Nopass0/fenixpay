use crate::models::{Merchant, Method};
use dialoguer::{theme::ColorfulTheme, Select, Input, Confirm};
use anyhow::Result;
use console::Style;

pub struct MerchantMenu;

#[derive(Debug, Clone)]
pub enum MerchantMenuItem {
    ConfigureTraffic,
    StartTraffic,
    StartTrafficQuiet,
    StopTraffic,
    ViewTransactions,
    ViewStatistics,
    ExportData,
    ConfigureCallback,
    TogglePaymentType,
    SetLiquidity,
    ViewLogs,
    Back,
}

impl MerchantMenu {
    pub fn show(merchant: &Merchant, traffic_info: Option<(bool, bool)>) -> Result<MerchantMenuItem> {
        let (is_traffic_running, is_quiet) = traffic_info.unwrap_or((false, false));
        
        let traffic_status = if is_traffic_running {
            if is_quiet {
                "Traffic Running (Quiet Mode)"
            } else {
                "Traffic Running"
            }
        } else {
            "Traffic Stopped"
        };
        
        let header = format!(
            "\n{} - {} ({})\nBalance: {} USDT | Liquidity: {}% | Payment Type: {:?}",
            Style::new().bold().apply_to(&merchant.name),
            if merchant.is_active { "Active" } else { "Inactive" },
            traffic_status,
            merchant.balance_usdt,
            merchant.liquidity_percentage,
            merchant.payment_type
        );
        
        println!("{}", header);
        
        let mut items = vec![
            "Configure Traffic Parameters",
        ];
        
        if is_traffic_running {
            items.push("Stop Traffic");
            if !is_quiet {
                items.push("View Traffic Logs");
            }
        } else {
            items.push("Start Traffic (With Logs)");
            items.push("Start Traffic (Quiet Mode)");
        }
        
        items.extend_from_slice(&[
            "View Transactions",
            "View Statistics",
            "Export Data",
            "Configure Callback URL",
            "Toggle Payment Type (RUB/USDT)",
            "Set Liquidity Percentage",
            "Back to Main Menu",
        ]);
        
        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Merchant Menu")
            .items(&items)
            .default(0)
            .interact()?;
            
        Ok(match (selection, is_traffic_running) {
            (0, _) => MerchantMenuItem::ConfigureTraffic,
            (1, true) => MerchantMenuItem::StopTraffic,
            (1, false) => MerchantMenuItem::StartTraffic,
            (2, true) if !is_quiet => MerchantMenuItem::ViewLogs,
            (2, false) => MerchantMenuItem::StartTrafficQuiet,
            (n, true) if !is_quiet => match n - 3 {
                0 => MerchantMenuItem::ViewTransactions,
                1 => MerchantMenuItem::ViewStatistics,
                2 => MerchantMenuItem::ExportData,
                3 => MerchantMenuItem::ConfigureCallback,
                4 => MerchantMenuItem::TogglePaymentType,
                5 => MerchantMenuItem::SetLiquidity,
                _ => MerchantMenuItem::Back,
            },
            (n, _) => match n - 2 {
                0 => MerchantMenuItem::ViewTransactions,
                1 => MerchantMenuItem::ViewStatistics,
                2 => MerchantMenuItem::ExportData,
                3 => MerchantMenuItem::ConfigureCallback,
                4 => MerchantMenuItem::TogglePaymentType,
                5 => MerchantMenuItem::SetLiquidity,
                _ => MerchantMenuItem::Back,
            },
        })
    }
    
    pub fn get_callback_url() -> Result<Option<String>> {
        let use_callback = Confirm::with_theme(&ColorfulTheme::default())
            .with_prompt("Do you want to set a callback URL?")
            .default(false)
            .interact()?;
            
        if use_callback {
            let url = Input::<String>::with_theme(&ColorfulTheme::default())
                .with_prompt("Callback URL")
                .default(format!("http://localhost:8080/callback"))
                .interact_text()?;
            Ok(Some(url))
        } else {
            Ok(None)
        }
    }
    
    pub fn get_liquidity_percentage() -> Result<f64> {
        loop {
            let input = Input::<String>::with_theme(&ColorfulTheme::default())
                .with_prompt("Liquidity percentage (0-100)")
                .interact_text()?;
                
            match input.parse::<f64>() {
                Ok(value) if (0.0..=100.0).contains(&value) => return Ok(value),
                _ => {
                    eprintln!("Please enter a valid percentage between 0 and 100");
                }
            }
        }
    }
    
    pub fn get_usdt_rate() -> Result<f64> {
        loop {
            let input = Input::<String>::with_theme(&ColorfulTheme::default())
                .with_prompt("USDT/RUB rate")
                .default("95.0".to_string())
                .interact_text()?;
                
            match input.parse::<f64>() {
                Ok(value) if value > 0.0 => return Ok(value),
                _ => {
                    eprintln!("Please enter a valid positive rate");
                }
            }
        }
    }
    
    pub fn select_method_id() -> Result<String> {
        // In a real implementation, this would fetch available methods from the API
        // For now, we'll use a hardcoded list
        let methods = vec![
            ("1", "Bank Card (RUB)"),
            ("2", "USDT TRC-20"),
            ("3", "SBP (Fast Payment System)"),
        ];
        
        let items: Vec<&str> = methods.iter().map(|(_, name)| *name).collect();
        
        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Select payment method")
            .items(&items)
            .default(0)
            .interact()?;
            
        Ok(methods[selection].0.to_string())
    }
    
    pub fn select_method_from_list(methods: &[Method]) -> Result<String> {
        let items: Vec<String> = methods
            .iter()
            .map(|m| format!("{} - {} ({})", m.code, m.name, m.method_type))
            .collect();
        
        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Select payment method")
            .items(&items)
            .default(0)
            .interact()?;
            
        Ok(methods[selection].id.clone())
    }
}