use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use rand;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Merchant {
    pub id: Uuid,
    pub name: String,
    pub api_key: String,
    pub callback_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub traffic_config: TrafficConfig,
    pub liquidity_percentage: f64, // 0-100%
    pub payment_type: PaymentType,
    pub rate: Option<f64>, // For USDT only
    pub is_active: bool,
    pub balance_usdt: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrafficConfig {
    pub enabled: bool,
    pub interval_ms: u64, // Random interval between transactions
    pub interval_variance: u64, // +/- variance for randomness
    pub max_transactions: Option<u64>, // Limit on total transactions
    pub created_count: u64,
    #[serde(with = "amount_range_map")]
    pub amount_probabilities: HashMap<AmountRange, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AmountRange {
    pub min: u64,
    pub max: u64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum PaymentType {
    Rub,
    UsdtTrc20,
}

impl Default for TrafficConfig {
    fn default() -> Self {
        let mut amount_probabilities = HashMap::new();
        
        // Default probabilities from requirements
        amount_probabilities.insert(AmountRange { min: 1000, max: 3000 }, 64.0);
        amount_probabilities.insert(AmountRange { min: 3000, max: 5000 }, 69.0);
        amount_probabilities.insert(AmountRange { min: 5000, max: 10000 }, 73.0);
        amount_probabilities.insert(AmountRange { min: 10000, max: 20000 }, 82.0);
        amount_probabilities.insert(AmountRange { min: 20000, max: 50000 }, 88.0);
        amount_probabilities.insert(AmountRange { min: 50000, max: 100000 }, 92.0);
        
        Self {
            enabled: false,
            interval_ms: 5000,
            interval_variance: 2000,
            max_transactions: None,
            created_count: 0,
            amount_probabilities,
        }
    }
}

impl Merchant {
    pub fn new(name: String, api_key: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            api_key,
            callback_url: None,
            created_at: Utc::now(),
            traffic_config: TrafficConfig::default(),
            liquidity_percentage: 80.0,
            payment_type: PaymentType::Rub,
            rate: None,
            is_active: true,
            balance_usdt: 0.0,
        }
    }
    
    pub fn is_liquid(&self) -> bool {
        let random: f64 = rand::random::<f64>() * 100.0;
        random <= self.liquidity_percentage
    }
}

// Custom serialization for HashMap<AmountRange, f64>
mod amount_range_map {
    use super::*;
    use serde::{Deserialize, Deserializer, Serialize, Serializer};
    use std::collections::HashMap;
    
    pub fn serialize<S>(map: &HashMap<AmountRange, f64>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let string_map: HashMap<String, f64> = map
            .iter()
            .map(|(k, v)| (format!("{}-{}", k.min, k.max), *v))
            .collect();
        string_map.serialize(serializer)
    }
    
    pub fn deserialize<'de, D>(deserializer: D) -> Result<HashMap<AmountRange, f64>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let string_map: HashMap<String, f64> = HashMap::deserialize(deserializer)?;
        let mut map = HashMap::new();
        
        for (k, v) in string_map {
            let parts: Vec<&str> = k.split('-').collect();
            if parts.len() == 2 {
                if let (Ok(min), Ok(max)) = (parts[0].parse::<u64>(), parts[1].parse::<u64>()) {
                    map.insert(AmountRange { min, max }, v);
                }
            }
        }
        
        Ok(map)
    }
}