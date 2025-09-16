use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MerchantInfo {
    pub id: String,
    pub name: String,
    #[serde(rename = "createdAt", default)]
    pub created_at: Option<String>,
    #[serde(rename = "totalTx", default)]
    pub total_tx: u64,
    #[serde(rename = "paidTx", default)]
    pub paid_tx: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceResponse {
    pub balance: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Method {
    pub id: String,
    pub code: String,
    pub name: String,
    #[serde(rename = "type")]
    pub method_type: String,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionListItem {
    pub id: String,
    pub order_id: String,
    pub amount: f64,
    pub status: String,
    #[serde(rename = "type")]
    pub transaction_type: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_mock: bool,
    pub method: Method,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionListResponse {
    pub data: Vec<TransactionListItem>,
    pub pagination: Pagination,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pagination {
    pub total: u64,
    pub page: u64,
    pub limit: u64,
    pub pages: u64,
}