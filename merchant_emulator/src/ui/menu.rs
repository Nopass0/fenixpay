use dialoguer::{theme::ColorfulTheme, Select, Input, Confirm};
use console::{Style, Term};
use anyhow::Result;

pub struct MainMenu;

#[derive(Debug, Clone)]
pub enum MenuItem {
    CreateMerchant,
    SelectMerchant,
    ViewStatistics,
    ExportData,
    DeviceEmulator,
    Settings,
    Exit,
}

impl MainMenu {
    pub fn show() -> Result<MenuItem> {
        let items = vec![
            "Create New Merchant",
            "Select Existing Merchant",
            "View Global Statistics",
            "Export Data",
            "Device Emulator",
            "Settings",
            "Exit",
        ];
        
        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Main Menu")
            .items(&items)
            .default(0)
            .interact()?;
            
        Ok(match selection {
            0 => MenuItem::CreateMerchant,
            1 => MenuItem::SelectMerchant,
            2 => MenuItem::ViewStatistics,
            3 => MenuItem::ExportData,
            4 => MenuItem::DeviceEmulator,
            5 => MenuItem::Settings,
            _ => MenuItem::Exit,
        })
    }
    
    pub fn get_merchant_details() -> Result<(String, String)> {
        let name = Input::<String>::with_theme(&ColorfulTheme::default())
            .with_prompt("Merchant name")
            .interact_text()?;
            
        let api_key = Input::<String>::with_theme(&ColorfulTheme::default())
            .with_prompt("API key")
            .interact_text()?;
            
        Ok((name, api_key))
    }
    
    pub fn confirm_action(message: &str) -> Result<bool> {
        Ok(Confirm::with_theme(&ColorfulTheme::default())
            .with_prompt(message)
            .default(false)
            .interact()?)
    }
    
    pub fn show_error(error: &str) {
        let error_style = Style::new().red().bold();
        eprintln!("{} {}", error_style.apply_to("Error:"), error);
        std::thread::sleep(std::time::Duration::from_secs(2));
    }
    
    pub fn show_success(message: &str) {
        let success_style = Style::new().green().bold();
        println!("{} {}", success_style.apply_to("Success:"), message);
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
    
    pub fn show_info(message: &str) {
        let info_style = Style::new().cyan();
        println!("{}", info_style.apply_to(message));
    }
    
    pub fn clear_screen() {
        let term = Term::stdout();
        let _ = term.clear_screen();
    }
}