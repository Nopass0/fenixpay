use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub device_code: Option<String>,
    pub token: Option<String>,
    pub trader_id: Option<String>,
    pub is_connected: bool,
    pub battery_level: u8,
    pub network_info: String,
    pub device_model: String,
    pub android_version: String,
    pub app_version: String,
    pub created_at: DateTime<Utc>,
    pub last_active_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceNotification {
    pub device_id: String,
    pub transaction_id: String,
    pub amount: f64,
    pub card_last_digits: String,
    pub timestamp: DateTime<Utc>,
    pub notification_type: NotificationType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationType {
    BalanceTopUp,
    TransactionReceived,
}