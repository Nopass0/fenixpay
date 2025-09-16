use crate::models::{Statistics, TransactionStatus};
use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use uuid::Uuid;

pub struct StatisticsService {
    stats: Arc<RwLock<HashMap<Uuid, Statistics>>>,
}

impl StatisticsService {
    pub fn new() -> Self {
        Self {
            stats: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    pub fn initialize_merchant(&self, merchant_id: Uuid) {
        let stats = Statistics {
            merchant_id,
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            total_amount: 0.0,
            callbacks_received: 0,
            liquid_transactions: 0,
            non_liquid_transactions: 0,
            error_breakdown: HashMap::new(),
            status_breakdown: HashMap::new(),
        };
        
        self.stats.write().insert(merchant_id, stats);
    }
    
    pub fn record_success(&self, merchant_id: Uuid, amount: f64, status: &TransactionStatus) {
        let mut stats_map = self.stats.write();
        if let Some(stats) = stats_map.get_mut(&merchant_id) {
            stats.total_requests += 1;
            stats.successful_requests += 1;
            stats.total_amount += amount;
            
            let status_str = format!("{:?}", status);
            *stats.status_breakdown.entry(status_str).or_insert(0) += 1;
        }
    }
    
    pub fn record_failure(&self, merchant_id: Uuid, error: &str) {
        let mut stats_map = self.stats.write();
        if let Some(stats) = stats_map.get_mut(&merchant_id) {
            stats.total_requests += 1;
            stats.failed_requests += 1;
            
            // Categorize error
            let error_category = if error.contains("400") || error.contains("Bad Request") {
                "Bad Request"
            } else if error.contains("401") || error.contains("Unauthorized") {
                "Unauthorized"
            } else if error.contains("403") || error.contains("Forbidden") {
                "Forbidden"
            } else if error.contains("404") || error.contains("Not Found") {
                "Not Found"
            } else if error.contains("500") || error.contains("Internal Server Error") {
                "Internal Server Error"
            } else if error.contains("timeout") || error.contains("Timeout") {
                "Timeout"
            } else {
                "Other"
            };
            
            *stats.error_breakdown.entry(error_category.to_string()).or_insert(0) += 1;
        }
    }
    
    pub fn record_callback(&self, merchant_id: Uuid) {
        let mut stats_map = self.stats.write();
        if let Some(stats) = stats_map.get_mut(&merchant_id) {
            stats.callbacks_received += 1;
        }
    }
    
    pub fn record_liquid_transaction(&self, merchant_id: Uuid) {
        let mut stats_map = self.stats.write();
        if let Some(stats) = stats_map.get_mut(&merchant_id) {
            stats.liquid_transactions += 1;
        }
    }
    
    pub fn record_non_liquid_transaction(&self, merchant_id: Uuid) {
        let mut stats_map = self.stats.write();
        if let Some(stats) = stats_map.get_mut(&merchant_id) {
            stats.non_liquid_transactions += 1;
        }
    }
    
    pub fn update_status(&self, merchant_id: &Uuid, status: &str) {
        let mut stats_map = self.stats.write();
        if let Some(stats) = stats_map.get_mut(merchant_id) {
            *stats.status_breakdown.entry(status.to_string()).or_insert(0) += 1;
        }
    }
    
    pub fn get_statistics(&self, merchant_id: &Uuid) -> Option<Statistics> {
        self.stats.read().get(merchant_id).cloned()
    }
    
    pub fn get_all_statistics(&self) -> HashMap<Uuid, Statistics> {
        self.stats.read().clone()
    }
}