use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    #[serde(rename = "numericId")]
    pub numeric_id: u64,
    #[serde(alias = "orderId")]
    pub order_id: String,
    pub amount: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub crypto: Option<f64>,
    pub status: TransactionStatus,
    #[serde(rename = "traderId")]
    pub trader_id: Option<String>,
    pub requisites: Option<TransactionRequisites>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub expired_at: String,
    pub method: Option<PaymentMethod>,
    #[serde(default)]
    pub is_mock: bool,
    #[serde(default)]
    pub callback_sent: bool,
    #[serde(alias = "methodId")]
    pub method_id: String,
    pub rate: Option<f64>,
}


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TransactionStatus {
    #[serde(rename = "CREATED")]
    Created,
    #[serde(rename = "IN_PROGRESS")]
    InProgress,
    #[serde(rename = "READY")]
    Ready,
    #[serde(rename = "CANCELED")]
    Canceled,
    #[serde(rename = "EXPIRED")]
    Expired,
    #[serde(rename = "DISPUTE")]
    Dispute,
    #[serde(rename = "PAUSED")]
    Paused,
    #[serde(rename = "FUNDS_RETURNED")]
    FundsReturned,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionRequisites {
    pub id: String,
    #[serde(rename = "bankType")]
    pub bank_type: String,
    #[serde(rename = "cardNumber")]
    pub card_number: String,
    #[serde(rename = "recipientName")]
    pub recipient_name: String,
    #[serde(rename = "traderName")]
    pub trader_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentMethod {
    pub id: String,
    pub code: String,
    pub name: String,
    #[serde(rename = "type")]
    pub method_type: String,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Requisites {
    pub id: String,
    pub bank_type: String,
    pub name: String,
    pub card: String,
    pub card_formatted: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionRequest {
    pub amount: f64,
    #[serde(rename = "orderId", alias = "order_id")]
    pub order_id: String,
    #[serde(rename = "methodId", alias = "method_id")]
    pub method_id: String,
    pub rate: Option<f64>,
    pub expired_at: String,
    pub user_ip: Option<String>,
    pub user_id: Option<String>,
    #[serde(rename = "type")]
    pub transaction_type: Option<String>,
    pub callback_uri: Option<String>,
    pub success_uri: Option<String>,
    pub fail_uri: Option<String>,
    pub is_mock: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionResponse {
    pub id: String,
    #[serde(rename = "numericId")]
    pub numeric_id: u64,
    pub amount: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub crypto: Option<f64>,
    pub status: TransactionStatus,
    #[serde(rename = "traderId")]
    pub trader_id: String,
    pub requisites: TransactionRequisites,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub expired_at: String,
    pub method: PaymentMethod,
    #[serde(default)]
    pub is_mock: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallbackRequest {
    pub id: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionHistory {
    pub merchant_id: Uuid,
    pub transaction: Transaction,
    pub request_time: DateTime<Utc>,
    pub response_time: DateTime<Utc>,
    pub request_body: TransactionRequest,
    pub response_status: u16,
    pub response_body: Option<serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Statistics {
    pub merchant_id: Uuid,
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub total_amount: f64,
    pub callbacks_received: u64,
    pub liquid_transactions: u64,
    pub non_liquid_transactions: u64,
    pub error_breakdown: std::collections::HashMap<String, u64>,
    pub status_breakdown: std::collections::HashMap<String, u64>,
}