use crate::models::{TrafficConfig, AmountRange};
use dialoguer::{theme::ColorfulTheme, Select, Input, Confirm};
use anyhow::Result;
use std::collections::HashMap;

pub struct TrafficMenu;

impl TrafficMenu {
    pub fn configure_traffic(current_config: &TrafficConfig) -> Result<TrafficConfig> {
        let mut config = current_config.clone();
        
        loop {
            println!("\nCurrent Traffic Configuration:");
            println!("  Interval: {} ms (±{} ms)", config.interval_ms, config.interval_variance);
            println!("  Max transactions: {:?}", config.max_transactions);
            println!("  Created so far: {}", config.created_count);
            println!("\n  Amount Probabilities:");
            
            let mut ranges: Vec<_> = config.amount_probabilities.iter().collect();
            ranges.sort_by_key(|(range, _)| range.min);
            
            for (range, prob) in &ranges {
                println!("    {}-{}: {}%", range.min, range.max, prob);
            }
            
            let items = vec![
                "Set interval (ms)",
                "Set interval variance (ms)",
                "Set max transactions",
                "Configure amount probabilities",
                "Reset to defaults",
                "Save and exit",
            ];
            
            let selection = Select::with_theme(&ColorfulTheme::default())
                .with_prompt("\nTraffic Configuration")
                .items(&items)
                .default(0)
                .interact()?;
                
            match selection {
                0 => {
                    config.interval_ms = Self::get_positive_number("Base interval (ms)", config.interval_ms as f64)? as u64;
                }
                1 => {
                    config.interval_variance = Self::get_positive_number("Interval variance (ms)", config.interval_variance as f64)? as u64;
                }
                2 => {
                    let use_limit = Confirm::with_theme(&ColorfulTheme::default())
                        .with_prompt("Set a transaction limit?")
                        .default(config.max_transactions.is_some())
                        .interact()?;
                        
                    if use_limit {
                        let limit = Self::get_positive_number("Max transactions", config.max_transactions.unwrap_or(1000) as f64)? as u64;
                        config.max_transactions = Some(limit);
                    } else {
                        config.max_transactions = None;
                    }
                }
                3 => {
                    config.amount_probabilities = Self::configure_probabilities()?;
                }
                4 => {
                    config = TrafficConfig::default();
                    println!("Reset to default configuration");
                }
                5 => {
                    return Ok(config);
                }
                _ => {}
            }
        }
    }
    
    fn get_positive_number(prompt: &str, default: f64) -> Result<f64> {
        loop {
            let input = Input::<String>::with_theme(&ColorfulTheme::default())
                .with_prompt(prompt)
                .default(default.to_string())
                .interact_text()?;
                
            match input.parse::<f64>() {
                Ok(value) if value > 0.0 => return Ok(value),
                _ => {
                    eprintln!("Please enter a positive number");
                }
            }
        }
    }
    
    fn configure_probabilities() -> Result<HashMap<AmountRange, f64>> {
        let mut probabilities = HashMap::new();
        
        println!("\nConfigure amount range probabilities");
        println!("Enter probability for each range (0-100%)");
        
        let ranges = vec![
            AmountRange { min: 1000, max: 3000 },
            AmountRange { min: 3000, max: 5000 },
            AmountRange { min: 5000, max: 10000 },
            AmountRange { min: 10000, max: 20000 },
            AmountRange { min: 20000, max: 50000 },
            AmountRange { min: 50000, max: 100000 },
        ];
        
        for range in ranges {
            let prompt = format!("{}-{} RUB", range.min, range.max);
            let default = match range.min {
                1000 => 64.0,
                3000 => 69.0,
                5000 => 73.0,
                10000 => 82.0,
                20000 => 88.0,
                50000 => 92.0,
                _ => 50.0,
            };
            
            let prob = Self::get_probability(&prompt, default)?;
            probabilities.insert(range, prob);
        }
        
        Ok(probabilities)
    }
    
    fn get_probability(prompt: &str, default: f64) -> Result<f64> {
        loop {
            let input = Input::<String>::with_theme(&ColorfulTheme::default())
                .with_prompt(prompt)
                .default(format!("{}", default))
                .interact_text()?;
                
            match input.parse::<f64>() {
                Ok(value) if (0.0..=100.0).contains(&value) => return Ok(value),
                _ => {
                    eprintln!("Please enter a valid percentage between 0 and 100");
                }
            }
        }
    }
}