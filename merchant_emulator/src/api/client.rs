use crate::models::*;
use anyhow::{anyhow, Result};
use reqwest::{Client, StatusCode};
use std::time::Duration;
use tracing::{debug, info, error};

pub struct ApiClient {
    client: Client,
    base_url: String,
}

impl ApiClient {
    pub fn new(base_url: String) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()?;
            
        Ok(Self { client, base_url })
    }
    
    pub async fn connect(&self, api_key: &str) -> Result<MerchantInfo> {
        let url = format!("{}/api/merchant/connect", self.base_url);
        
        let response = self.client
            .get(&url)
            .header("x-merchant-api-key", api_key)
            .send()
            .await?;
            
        let status = response.status();
        let body = response.text().await?;
        
        debug!("Connect response: status={}, body={}", status, body);
        
        if status.is_success() {
            Ok(serde_json::from_str(&body)?)
        } else {
            let error: ErrorResponse = serde_json::from_str(&body)
                .unwrap_or_else(|_| ErrorResponse { error: body });
            Err(anyhow!("API error ({}): {}", status, error.error))
        }
    }
    
    pub async fn get_balance(&self, api_key: &str) -> Result<f64> {
        let url = format!("{}/api/merchant/balance", self.base_url);
        
        let response = self.client
            .get(&url)
            .header("x-merchant-api-key", api_key)
            .send()
            .await?;
            
        let status = response.status();
        let body = response.text().await?;
        
        debug!("Balance API response: status={}, body={}", status, body);
        
        if status.is_success() {
            match serde_json::from_str::<BalanceResponse>(&body) {
                Ok(balance) => Ok(balance.balance),
                Err(e) => {
                    error!("Failed to parse balance response: {}, body: {}", e, body);
                    Err(anyhow!("Failed to parse balance response: {}", e))
                }
            }
        } else {
            let error: ErrorResponse = serde_json::from_str(&body)
                .unwrap_or_else(|_| ErrorResponse { error: body });
            Err(anyhow!("API error ({}): {}", status, error.error))
        }
    }
    
    pub async fn create_transaction(
        &self,
        api_key: &str,
        request: TransactionRequest,
    ) -> Result<TransactionResponse> {
        let url = format!("{}/api/merchant/transactions/create", self.base_url);
        
        info!("Creating transaction: {:?}", request);
        
        let response = self.client
            .post(&url)
            .header("x-merchant-api-key", api_key)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;
            
        let status = response.status();
        let body = response.text().await?;
        
        debug!("Transaction response: status={}, body={}", status, body);
        
        if status == StatusCode::CREATED || status.is_success() {
            Ok(serde_json::from_str(&body)?)
        } else {
            let error: ErrorResponse = serde_json::from_str(&body)
                .unwrap_or_else(|_| ErrorResponse { error: body });
            Err(anyhow!("API error ({}): {}", status, error.error))
        }
    }
    
    pub async fn get_transaction(&self, api_key: &str, order_id: &str) -> Result<TransactionListItem> {
        let url = format!("{}/api/merchant/transactions?orderId={}", self.base_url, order_id);
        
        let response = self.client
            .get(&url)
            .header("x-merchant-api-key", api_key)
            .send()
            .await?;
            
        let status = response.status();
        let body = response.text().await?;
        
        if status.is_success() {
            let list: TransactionListResponse = serde_json::from_str(&body)?;
            list.data.into_iter()
                .next()
                .ok_or_else(|| anyhow!("Transaction not found"))
        } else {
            let error: ErrorResponse = serde_json::from_str(&body)
                .unwrap_or_else(|_| ErrorResponse { error: body });
            Err(anyhow!("API error ({}): {}", status, error.error))
        }
    }
    
    pub async fn get_transactions(
        &self,
        api_key: &str,
        page: u64,
        limit: u64,
    ) -> Result<TransactionListResponse> {
        let url = format!(
            "{}/api/merchant/transactions?page={}&limit={}",
            self.base_url, page, limit
        );
        
        let response = self.client
            .get(&url)
            .header("x-merchant-api-key", api_key)
            .send()
            .await?;
            
        let status = response.status();
        let body = response.text().await?;
        
        if status.is_success() {
            Ok(serde_json::from_str(&body)?)
        } else {
            let error: ErrorResponse = serde_json::from_str(&body)
                .unwrap_or_else(|_| ErrorResponse { error: body });
            Err(anyhow!("API error ({}): {}", status, error.error))
        }
    }
    
    pub async fn get_methods(&self, api_key: &str) -> Result<Vec<Method>> {
        let url = format!("{}/api/merchant/methods", self.base_url);
        
        let response = self.client
            .get(&url)
            .header("x-merchant-api-key", api_key)
            .send()
            .await?;
            
        let status = response.status();
        let body = response.text().await?;
        
        debug!("Methods API response: status={}, body={}", status, body);
        
        if status.is_success() {
            Ok(serde_json::from_str(&body)?)
        } else {
            let error: ErrorResponse = serde_json::from_str(&body)
                .unwrap_or_else(|_| ErrorResponse { error: body });
            Err(anyhow!("API error ({}): {}", status, error.error))
        }
    }
}