use crate::models::{DeviceNotification, NotificationType};
use anyhow::Result;
use tokio::sync::mpsc;
use tracing::{info, debug};
use chrono::Utc;

pub struct NotificationEmulator {
    sender: mpsc::UnboundedSender<DeviceNotification>,
    receiver: mpsc::UnboundedReceiver<DeviceNotification>,
}

impl NotificationEmulator {
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::unbounded_channel();
        Self { sender, receiver }
    }
    
    pub fn get_sender(&self) -> mpsc::UnboundedSender<DeviceNotification> {
        self.sender.clone()
    }
    
    pub async fn try_recv(&mut self) -> Option<DeviceNotification> {
        self.receiver.try_recv().ok()
    }
    
    pub fn emit_balance_topup(
        &self,
        device_id: String,
        transaction_id: String,
        amount: f64,
        card_last_digits: String,
    ) -> Result<()> {
        let notification = DeviceNotification {
            device_id,
            transaction_id,
            amount,
            card_last_digits,
            timestamp: Utc::now(),
            notification_type: NotificationType::BalanceTopUp,
        };
        
        info!("Emitting balance top-up notification: {:?}", notification);
        
        self.sender.send(notification)?;
        Ok(())
    }
    
    pub fn emit_transaction_received(
        &self,
        device_id: String,
        transaction_id: String,
        amount: f64,
        card_last_digits: String,
    ) -> Result<()> {
        let notification = DeviceNotification {
            device_id,
            transaction_id,
            amount,
            card_last_digits,
            timestamp: Utc::now(),
            notification_type: NotificationType::TransactionReceived,
        };
        
        debug!("Emitting transaction received notification: {:?}", notification);
        
        self.sender.send(notification)?;
        Ok(())
    }
}