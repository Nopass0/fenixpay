use crate::models::*;
use crate::api::ApiClient;
use crate::services::{StorageService, StatisticsService};
use anyhow::Result;
use std::sync::Arc;
use uuid::Uuid;
use chrono::Utc;
use tracing::{info, error};

pub struct MerchantService {
    api_client: Arc<ApiClient>,
    storage: Arc<StorageService>,
    stats_service: Arc<StatisticsService>,
}

impl MerchantService {
    pub fn new(
        api_client: Arc<ApiClient>,
        storage: Arc<StorageService>,
        stats_service: Arc<StatisticsService>,
    ) -> Self {
        Self {
            api_client,
            storage,
            stats_service,
        }
    }
    
    pub async fn create_merchant(&self, name: String, api_key: String) -> Result<Merchant> {
        info!("Creating merchant with name: {}", name);
        
        // Verify API key by connecting
        info!("Verifying API key...");
        let _merchant_info = self.api_client.connect(&api_key).await?;
        info!("API key verified successfully");
        
        let mut merchant = Merchant::new(name.clone(), api_key);
        
        info!("Getting balance...");
        merchant.balance_usdt = self.api_client.get_balance(&merchant.api_key).await.unwrap_or(0.0);
        info!("Balance retrieved: {}", merchant.balance_usdt);
        
        info!("Adding merchant to storage...");
        self.storage.add_merchant(merchant.clone())?;
        
        info!("Saving merchants to file...");
        if let Err(e) = self.storage.save_merchants().await {
            error!("Failed to save merchants: {}", e);
            return Err(e);
        }
        
        // Initialize statistics
        self.stats_service.initialize_merchant(merchant.id);
        
        info!("Created merchant: {} ({})", merchant.name, merchant.id);
        
        Ok(merchant)
    }
    
    pub async fn update_merchant(&self, merchant: Merchant) -> Result<()> {
        self.storage.update_merchant(merchant.clone())?;
        self.storage.save_merchants().await?;
        Ok(())
    }
    
    pub fn get_merchant(&self, id: &Uuid) -> Option<Merchant> {
        self.storage.get_merchant(id)
    }
    
    pub fn get_all_merchants(&self) -> Vec<Merchant> {
        self.storage.get_all_merchants()
    }
    
    pub async fn create_transaction(
        &self,
        merchant: &Merchant,
        amount: f64,
        method_id: String,
        is_mock: bool,
    ) -> Result<Transaction> {
        let order_id = format!("order_{}", Uuid::new_v4());
        let expired_at = (Utc::now() + chrono::Duration::hours(24)).to_rfc3339();
        
        let mut request = TransactionRequest {
            amount,
            order_id: order_id.clone(),
            method_id: method_id.clone(),
            rate: None,
            expired_at,
            user_ip: Some("127.0.0.1".to_string()),
            user_id: Some(format!("user_{}", Uuid::new_v4())),
            transaction_type: Some("IN".to_string()),
            callback_uri: merchant.callback_url.clone(),
            success_uri: None,
            fail_uri: None,
            is_mock: Some(is_mock),
        };
        
        // Set rate - API always expects a rate value
        request.rate = match merchant.payment_type {
            PaymentType::UsdtTrc20 => merchant.rate.or(Some(95.0)), // Default rate if not set
            PaymentType::Rub => Some(1.0), // Rate of 1.0 for RUB transactions
        };
        
        let start_time = Utc::now();
        
        let result = self.api_client.create_transaction(&merchant.api_key, request.clone()).await;
        
        let end_time = Utc::now();
        
        match result {
            Ok(response) => {
                let transaction = Transaction {
                    id: response.id.clone(),
                    numeric_id: response.numeric_id,
                    order_id: order_id.clone(),
                    amount: response.amount,
                    crypto: response.crypto,
                    status: response.status.clone(),
                    trader_id: Some(response.trader_id.clone()),
                    requisites: Some(TransactionRequisites {
                        id: response.requisites.id.clone(),
                        bank_type: response.requisites.bank_type.clone(),
                        card_number: response.requisites.card_number.clone(),
                        recipient_name: response.requisites.recipient_name.clone(),
                        trader_name: response.requisites.trader_name.clone(),
                    }),
                    created_at: response.created_at.clone(),
                    updated_at: response.updated_at.clone(),
                    expired_at: response.expired_at.clone(),
                    method: Some(response.method.clone()),
                    is_mock: response.is_mock,
                    callback_sent: false,
                    method_id: method_id.clone(),
                    rate: request.rate,
                };
                
                // Save to history
                let history = TransactionHistory {
                    merchant_id: merchant.id,
                    transaction: transaction.clone(),
                    request_time: start_time,
                    response_time: end_time,
                    request_body: request,
                    response_status: 201,
                    response_body: Some(serde_json::to_value(&response)?),
                    error: None,
                };
                
                self.storage.add_transaction(history);
                self.storage.save_transactions().await?;
                
                // Update statistics
                self.stats_service.record_success(merchant.id, amount, &transaction.status);
                
                if merchant.is_liquid() {
                    self.stats_service.record_liquid_transaction(merchant.id);
                } else {
                    self.stats_service.record_non_liquid_transaction(merchant.id);
                }
                
                info!("Transaction created: {} (amount: {}, status: {:?})", 
                    transaction.id, transaction.amount, transaction.status);
                
                Ok(transaction)
            }
            Err(e) => {
                error!("Failed to create transaction: {}", e);
                
                // Save failed attempt
                let history = TransactionHistory {
                    merchant_id: merchant.id,
                    transaction: Transaction {
                        id: String::new(),
                        numeric_id: 0,
                        order_id,
                        amount,
                        crypto: None,
                        status: TransactionStatus::Canceled,
                        trader_id: None,
                        requisites: None,
                        created_at: start_time.to_rfc3339(),
                        updated_at: end_time.to_rfc3339(),
                        expired_at: request.expired_at.clone(),
                        method: None,
                        is_mock,
                        callback_sent: false,
                        method_id,
                        rate: request.rate,
                    },
                    request_time: start_time,
                    response_time: end_time,
                    request_body: request,
                    response_status: 500,
                    response_body: None,
                    error: Some(e.to_string()),
                };
                
                self.storage.add_transaction(history);
                self.storage.save_transactions().await?;
                
                // Update statistics
                self.stats_service.record_failure(merchant.id, &e.to_string());
                
                Err(e)
            }
        }
    }
    
    pub async fn handle_callback(&self, merchant_id: Uuid, callback: CallbackRequest) -> Result<()> {
        info!("Handling callback for merchant {}: {:?}", merchant_id, callback);
        
        // Update statistics
        self.stats_service.record_callback(merchant_id);
        
        // Fetch updated transaction details
        if let Some(merchant) = self.get_merchant(&merchant_id) {
            match self.api_client.get_transaction(&merchant.api_key, &callback.id).await {
                Ok(transaction) => {
                    info!("Updated transaction details: {:?}", transaction);
                    
                    // Update status breakdown
                    self.stats_service.update_status(&merchant_id, &transaction.status);
                }
                Err(e) => {
                    error!("Failed to fetch transaction details: {}", e);
                }
            }
        }
        
        Ok(())
    }
    
    pub async fn export_merchant_data(
        &self,
        merchant_id: &Uuid,
        export_dir: &std::path::PathBuf,
    ) -> Result<(std::path::PathBuf, std::path::PathBuf)> {
        let history_path = self.storage.export_history(merchant_id, export_dir).await?;
        let stats_path = self.storage.export_statistics(merchant_id, export_dir).await?;
        
        info!("Exported merchant data: history={:?}, stats={:?}", history_path, stats_path);
        
        Ok((history_path, stats_path))
    }
    
    pub async fn get_available_methods(&self, merchant: &Merchant) -> Result<Vec<Method>> {
        info!("Getting available methods for merchant {}", merchant.name);
        self.api_client.get_methods(&merchant.api_key).await
    }
}