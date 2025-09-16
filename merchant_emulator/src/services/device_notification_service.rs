use crate::device::{DeviceManager, DeviceApiClient, NotificationRequest};
use crate::models::{Merchant, Transaction};
use anyhow::Result;
use std::sync::Arc;
use tracing::{info, error};
use chrono::Utc;

pub struct DeviceNotificationService {
    device_manager: Arc<DeviceManager>,
    api_client: Arc<DeviceApiClient>,
}

impl DeviceNotificationService {
    pub fn new(device_manager: Arc<DeviceManager>, api_client: Arc<DeviceApiClient>) -> Self {
        Self {
            device_manager,
            api_client,
        }
    }

    pub async fn send_transaction_notification(
        &self,
        merchant: &Merchant,
        transaction: &Transaction,
    ) -> Result<()> {
        // Check if merchant has liquid transactions enabled
        if !merchant.is_liquid() {
            info!("Transaction is not liquid, skipping device notification");
            return Ok(());
        }

        // Get trader ID from transaction
        let trader_id = match &transaction.trader_id {
            Some(id) => id,
            None => {
                info!("Transaction has no trader ID, skipping device notification");
                return Ok(());
            }
        };

        // Get connected devices for trader
        let devices = self.device_manager.get_connected_devices_for_trader(trader_id);
        
        if devices.is_empty() {
            info!("No connected devices found for trader {}", trader_id);
            return Ok(());
        }

        // Get bank info from transaction requisites
        let (bank_name, card_last_digits) = if let Some(requisites) = &transaction.requisites {
            let bank = match requisites.bank_type.as_str() {
                "sber" | "sberbank" => "Сбербанк",
                "tinkoff" | "t-bank" | "tbank" => "Тинькофф",
                "alfa" | "alfabank" | "alpha" => "Альфа-Банк",
                "vtb" => "ВТБ",
                "raiffeisen" | "raiff" => "Райффайзен",
                "otkritie" | "openbank" => "Открытие",
                "gazprombank" | "gazprom" => "Газпромбанк",
                "ozon" | "ozonbank" => "Озон Банк",
                "otp" | "otpbank" => "ОТП Банк",
                "psb" | "promsvyazbank" => "ПСБ",
                "domrf" | "dom.rf" => "ДОМ.РФ",
                "mts" | "mtsbank" => "МТС Банк",
                "uralsib" | "ubrr" => "УралСиб",
                "pochta" | "pochtabank" => "Почта Банк",
                "spb" | "bspb" | "bankspb" => "Банк СПб",
                "rnkb" => "РНКБ",
                "rshb" | "rosselhoz" => "Россельхозбанк",
                "homecredit" | "home" => "Хоум Кредит",
                _ => "Банк",
            };
            
            let last_digits = requisites.card_number.chars()
                .rev()
                .take(4)
                .collect::<String>()
                .chars()
                .rev()
                .collect::<String>();
                
            (bank.to_string(), last_digits)
        } else {
            ("Банк".to_string(), "****".to_string())
        };

        // Create bank-specific notification
        let (package_name, app_name, title, content) = match requisites.bank_type.as_str() {
            "sber" | "sberbank" => (
                "ru.sberbankmobile".to_string(),
                "СберБанк".to_string(),
                "900".to_string(),
                format!("СЧЁТ*{} {} зачислен перевод {:.0}р. Баланс: {:.2}р", 
                    card_last_digits, 
                    Utc::now().format("%d.%m.%y"),
                    transaction.amount,
                    transaction.amount + 1000.0
                )
            ),
            "tinkoff" | "t-bank" | "tbank" => (
                "com.idamob.tinkoff.android".to_string(),
                "T-Bank".to_string(),
                "T-Bank".to_string(),
                format!("Пополнение, счет RUB. {:.0} RUB. Доступно {:.2} RUB", 
                    transaction.amount,
                    transaction.amount + 500.0
                )
            ),
            "otp" | "otpbank" => (
                "ru.otpbank".to_string(),
                "ОТП Банк".to_string(),
                "OTP Bank".to_string(),
                format!("Счет *{} зачисление {:.0}р. Доступно {:.2}р. otpbank.ru/tr",
                    card_last_digits,
                    transaction.amount,
                    transaction.amount + 755.03
                )
            ),
            "mts" | "mtsbank" => (
                "ru.mtsbank.mobile".to_string(),
                "МТС Банк".to_string(),
                "MTS-Bank".to_string(),
                format!("Перевод на карту {:.2} RUB PEREVOD DR BANK Остаток: {:.2} RUB; *{}",
                    transaction.amount,
                    transaction.amount + 122.50,
                    card_last_digits
                )
            ),
            "domrf" | "dom.rf" => (
                "ru.domrf.mobile".to_string(),
                "ДОМ.РФ".to_string(),
                "Bank_DOM.RF".to_string(),
                format!("Пополнение +{:.2} RUB на счет **{} успешно. Доступно {:.2} RUB",
                    transaction.amount,
                    card_last_digits,
                    transaction.amount + 1612.00
                )
            ),
            _ => {
                // Default format for other banks
                let package = match requisites.bank_type.as_str() {
                    "alfa" | "alfabank" => "ru.alfabank.mobile.android",
                    "vtb" => "ru.vtb24.mobilebanking.android",
                    "gazprombank" => "ru.gazprombank.android.mobilebank.app",
                    "ozon" => "ru.ozon.app.android",
                    "psb" => "ru.psbank.mobile",
                    "raiffeisen" => "ru.raiffeisen.mobile.new",
                    "uralsib" => "ru.uralsib.mobile",
                    "pochta" => "ru.pochta.bank",
                    "spb" | "bspb" => "com.bssys.bspb",
                    "rnkb" => "com.fakemobile.rnkb",
                    "rshb" => "ru.rshb.mbank",
                    _ => "com.bank.app"
                };
                (
                    package.to_string(),
                    bank_name.clone(),
                    format!("{} Online", bank_name),
                    format!("Пополнение +{:.2} ₽\nКарта *{}", 
                        transaction.amount, 
                        card_last_digits
                    )
                )
            }
        };

        let notification = NotificationRequest {
            package_name,
            app_name,
            title,
            content,
            timestamp: Utc::now().timestamp_millis(),
            priority: 2,
            category: "transaction".to_string(),
        };

        // Send notification to all connected devices
        for device in devices {
            if let Some(token) = &device.token {
                info!(
                    "Sending notification to device {} for transaction {}", 
                    device.id, 
                    transaction.id
                );
                
                match self.api_client.send_notification(token, notification.clone()).await {
                    Ok(_) => {
                        info!("Notification sent successfully to device {}", device.id);
                    }
                    Err(e) => {
                        error!("Failed to send notification to device {}: {}", device.id, e);
                    }
                }
            }
        }

        Ok(())
    }

    pub async fn send_test_notification(
        &self,
        device_id: &str,
        bank_name: &str,
        amount: f64,
    ) -> Result<()> {
        let device = self.device_manager.get_device(device_id)
            .ok_or_else(|| anyhow::anyhow!("Device not found"))?;

        if !device.is_connected {
            return Err(anyhow::anyhow!("Device is not connected"));
        }

        let token = device.token
            .ok_or_else(|| anyhow::anyhow!("Device has no token"))?;

        // Generate bank-specific test notification
        let (package_name, app_name, title, content) = match bank_name.to_lowercase().as_str() {
            "sber" | "sberbank" | "сбер" | "сбербанк" => (
                "ru.sberbankmobile".to_string(),
                "СберБанк".to_string(),
                "900".to_string(),
                format!("СЧЁТ*1234 {} зачислен перевод {:.0}р. Баланс: {:.2}р", 
                    Utc::now().format("%d.%m.%y"),
                    amount,
                    amount + 1000.0
                )
            ),
            "tinkoff" | "t-bank" | "tbank" | "тинькофф" | "т-банк" => (
                "com.idamob.tinkoff.android".to_string(),
                "T-Bank".to_string(),
                "T-Bank".to_string(),
                format!("Пополнение, счет RUB. {:.0} RUB. Доступно {:.2} RUB", 
                    amount,
                    amount + 500.0
                )
            ),
            "otp" | "otpbank" | "отп" => (
                "ru.otpbank".to_string(),
                "ОТП Банк".to_string(),
                "OTP Bank".to_string(),
                format!("Счет *0084 зачисление {:.0}р. Доступно {:.2}р. otpbank.ru/tr",
                    amount,
                    amount + 755.03
                )
            ),
            "mts" | "mtsbank" | "мтс" => (
                "ru.mtsbank.mobile".to_string(),
                "МТС Банк".to_string(),
                "MTS-Bank".to_string(),
                format!("Перевод на карту {:.2} RUB PEREVOD DR BANK Остаток: {:.2} RUB; *9131",
                    amount,
                    amount + 122.50
                )
            ),
            "domrf" | "dom.rf" | "дом.рф" => (
                "ru.domrf.mobile".to_string(),
                "ДОМ.РФ".to_string(),
                "Bank_DOM.RF".to_string(),
                format!("Пополнение +{:.2} RUB на счет **8577 успешно. Доступно {:.2} RUB",
                    amount,
                    amount + 1612.00
                )
            ),
            "alfa" | "alfabank" | "альфа" => (
                "ru.alfabank.mobile.android".to_string(),
                "Альфа-Банк".to_string(),
                "Альфа-Банк".to_string(),
                format!("Счёт RUB: Перевод СБП от ИВАН И. +{:.2} р.", amount)
            ),
            "vtb" | "втб" => (
                "ru.vtb24.mobilebanking.android".to_string(),
                "ВТБ".to_string(),
                "ВТБ Online".to_string(),
                format!("Карта *1234. Зачисление {:.2} RUB. Баланс: {:.2} RUB", 
                    amount,
                    amount + 2000.0
                )
            ),
            "psb" | "псб" => (
                "ru.psbank.mobile".to_string(),
                "ПСБ".to_string(),
                "ПСБ".to_string(),
                format!("Поступление {:.2} руб. Карта *5678. Баланс {:.2} руб.",
                    amount,
                    amount + 3000.0
                )
            ),
            "uralsib" | "уралсиб" => (
                "ru.uralsib.mobile".to_string(),
                "УралСиб".to_string(),
                "UBRR".to_string(),
                format!("Пополнение *2301 Сумма {:.2} р Остаток {:.2} р",
                    amount,
                    amount + 663.20
                )
            ),
            "raiffeisen" | "райф" | "райффайзен" => (
                "ru.raiffeisen.mobile.new".to_string(),
                "Райффайзен".to_string(),
                "Raiffeisen".to_string(),
                format!("Зачисление {:.2} RUB. Карта *4321. Доступно {:.2} RUB",
                    amount,
                    amount + 1500.0
                )
            ),
            "pochta" | "почта" => (
                "ru.pochta.bank".to_string(),
                "Почта Банк".to_string(),
                "Почта Банк".to_string(),
                format!("Перевод +{:.2}р на карту *6789. Баланс {:.2}р",
                    amount,
                    amount + 800.0
                )
            ),
            "spb" | "bspb" | "спб" => (
                "com.bssys.bspb".to_string(),
                "Банк СПб".to_string(),
                "BankSPB".to_string(),
                format!("*0977 Зачислен перевод по СБП {:.0}RUB {}",
                    amount,
                    Utc::now().format("%H:%M")
                )
            ),
            _ => (
                format!("com.{}.app", bank_name.to_lowercase().replace(" ", "")),
                bank_name.to_string(),
                format!("{} Online", bank_name),
                format!("Пополнение +{:.2} ₽", amount)
            )
        };

        let notification = NotificationRequest {
            package_name,
            app_name,
            title,
            content,
            timestamp: Utc::now().timestamp_millis(),
            priority: 2,
            category: "transaction".to_string(),
        };

        self.api_client.send_notification(&token, notification).await?;
        
        Ok(())
    }
}