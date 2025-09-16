use crate::models::*;
use anyhow::Result;
use std::path::PathBuf;
use std::collections::HashMap;
use tokio::fs;
use uuid::Uuid;
use parking_lot::RwLock;
use std::sync::Arc;

pub struct StorageService {
    data_dir: PathBuf,
    merchants: Arc<RwLock<HashMap<Uuid, Merchant>>>,
    transactions: Arc<RwLock<Vec<TransactionHistory>>>,
    statistics: Arc<RwLock<HashMap<Uuid, Statistics>>>,
}

impl StorageService {
    pub async fn new(data_dir: PathBuf) -> Result<Self> {
        fs::create_dir_all(&data_dir).await?;
        
        let mut service = Self {
            data_dir: data_dir.clone(),
            merchants: Arc::new(RwLock::new(HashMap::new())),
            transactions: Arc::new(RwLock::new(Vec::new())),
            statistics: Arc::new(RwLock::new(HashMap::new())),
        };
        
        // Load existing data
        service.load_merchants().await?;
        service.load_transactions().await?;
        service.load_statistics().await?;
        
        Ok(service)
    }
    
    async fn load_merchants(&mut self) -> Result<()> {
        let path = self.data_dir.join("merchants.json");
        if path.exists() {
            let data = fs::read_to_string(&path).await?;
            // Try to load from new format (String keys)
            if let Ok(merchants_from_json) = serde_json::from_str::<HashMap<String, Merchant>>(&data) {
                let merchants: HashMap<Uuid, Merchant> = merchants_from_json
                    .into_iter()
                    .map(|(k, v)| (Uuid::parse_str(&k).unwrap_or(v.id), v))
                    .collect();
                *self.merchants.write() = merchants;
            } else {
                // Fallback to old format (Uuid keys) for backward compatibility
                let merchants: HashMap<Uuid, Merchant> = serde_json::from_str(&data)?;
                *self.merchants.write() = merchants;
            }
        }
        Ok(())
    }
    
    async fn load_transactions(&mut self) -> Result<()> {
        let path = self.data_dir.join("transactions.json");
        if path.exists() {
            let data = fs::read_to_string(&path).await?;
            let transactions: Vec<TransactionHistory> = serde_json::from_str(&data)?;
            *self.transactions.write() = transactions;
        }
        Ok(())
    }
    
    async fn load_statistics(&mut self) -> Result<()> {
        let path = self.data_dir.join("statistics.json");
        if path.exists() {
            let data = fs::read_to_string(&path).await?;
            // Try to load from new format (String keys)
            if let Ok(stats_from_json) = serde_json::from_str::<HashMap<String, Statistics>>(&data) {
                let stats: HashMap<Uuid, Statistics> = stats_from_json
                    .into_iter()
                    .filter_map(|(k, v)| Uuid::parse_str(&k).ok().map(|uuid| (uuid, v)))
                    .collect();
                *self.statistics.write() = stats;
            } else {
                // Fallback to old format
                let stats: HashMap<Uuid, Statistics> = serde_json::from_str(&data)?;
                *self.statistics.write() = stats;
            }
        }
        Ok(())
    }
    
    pub async fn save_merchants(&self) -> Result<()> {
        let path = self.data_dir.join("merchants.json");
        // Convert HashMap<Uuid, Merchant> to HashMap<String, Merchant> for JSON serialization
        let merchants = self.merchants.read();
        let merchants_for_json: HashMap<String, &Merchant> = merchants
            .iter()
            .map(|(k, v)| (k.to_string(), v))
            .collect();
        let data = serde_json::to_string_pretty(&merchants_for_json)?;
        fs::write(&path, data).await?;
        Ok(())
    }
    
    pub async fn save_transactions(&self) -> Result<()> {
        let path = self.data_dir.join("transactions.json");
        let data = serde_json::to_string_pretty(&*self.transactions.read())?;
        fs::write(&path, data).await?;
        Ok(())
    }
    
    pub async fn save_statistics(&self) -> Result<()> {
        let path = self.data_dir.join("statistics.json");
        // Convert HashMap<Uuid, Statistics> to HashMap<String, Statistics> for JSON serialization
        let stats = self.statistics.read();
        let stats_for_json: HashMap<String, &Statistics> = stats
            .iter()
            .map(|(k, v)| (k.to_string(), v))
            .collect();
        let data = serde_json::to_string_pretty(&stats_for_json)?;
        fs::write(&path, data).await?;
        Ok(())
    }
    
    pub fn add_merchant(&self, merchant: Merchant) -> Result<()> {
        self.merchants.write().insert(merchant.id, merchant);
        Ok(())
    }
    
    pub fn get_merchant(&self, id: &Uuid) -> Option<Merchant> {
        self.merchants.read().get(id).cloned()
    }
    
    pub fn get_all_merchants(&self) -> Vec<Merchant> {
        self.merchants.read().values().cloned().collect()
    }
    
    pub fn update_merchant(&self, merchant: Merchant) -> Result<()> {
        self.merchants.write().insert(merchant.id, merchant);
        Ok(())
    }
    
    pub fn add_transaction(&self, history: TransactionHistory) {
        self.transactions.write().push(history);
    }
    
    pub fn get_merchant_transactions(&self, merchant_id: &Uuid) -> Vec<TransactionHistory> {
        self.transactions
            .read()
            .iter()
            .filter(|t| &t.merchant_id == merchant_id)
            .cloned()
            .collect()
    }
    
    pub fn get_statistics(&self, merchant_id: &Uuid) -> Option<Statistics> {
        self.statistics.read().get(merchant_id).cloned()
    }
    
    pub fn update_statistics(&self, merchant_id: Uuid, stats: Statistics) {
        self.statistics.write().insert(merchant_id, stats);
    }
    
    pub async fn export_history(&self, merchant_id: &Uuid, export_dir: &PathBuf) -> Result<PathBuf> {
        fs::create_dir_all(export_dir).await?;
        
        let transactions = self.get_merchant_transactions(merchant_id);
        let filename = format!("merchant_{}_history_{}.json", 
            merchant_id, 
            chrono::Utc::now().format("%Y%m%d_%H%M%S")
        );
        let path = export_dir.join(filename);
        
        let data = serde_json::to_string_pretty(&transactions)?;
        fs::write(&path, data).await?;
        
        Ok(path)
    }
    
    pub async fn export_statistics(&self, merchant_id: &Uuid, export_dir: &PathBuf) -> Result<PathBuf> {
        fs::create_dir_all(export_dir).await?;
        
        let stats = self.get_statistics(merchant_id)
            .ok_or_else(|| anyhow::anyhow!("No statistics found for merchant"))?;
            
        let filename = format!("merchant_{}_stats_{}.json", 
            merchant_id, 
            chrono::Utc::now().format("%Y%m%d_%H%M%S")
        );
        let path = export_dir.join(filename);
        
        let data = serde_json::to_string_pretty(&stats)?;
        fs::write(&path, data).await?;
        
        Ok(path)
    }
}