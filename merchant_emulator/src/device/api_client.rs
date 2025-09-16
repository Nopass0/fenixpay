use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Serialize)]
pub struct ConnectDeviceRequest {
    #[serde(rename = "deviceCode")]
    pub device_code: String,
    #[serde(rename = "batteryLevel")]
    pub battery_level: u8,
    #[serde(rename = "networkInfo")]
    pub network_info: String,
    #[serde(rename = "deviceModel")]
    pub device_model: String,
    #[serde(rename = "androidVersion")]
    pub android_version: String,
    #[serde(rename = "appVersion")]
    pub app_version: String,
}

#[derive(Debug, Deserialize)]
pub struct ConnectDeviceResponse {
    pub status: String,
    pub token: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct NotificationRequest {
    #[serde(rename = "packageName")]
    pub package_name: String,
    #[serde(rename = "appName")]
    pub app_name: String,
    pub title: String,
    pub content: String,
    pub timestamp: i64,
    pub priority: i32,
    pub category: String,
}

#[derive(Clone)]
pub struct DeviceApiClient {
    client: Client,
    base_url: String,
}

impl DeviceApiClient {
    pub fn new(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
        }
    }

    pub async fn connect_device(&self, request: ConnectDeviceRequest) -> Result<ConnectDeviceResponse> {
        let url = format!("{}/api/device/connect", self.base_url);
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;

        let status = response.status();
        let body = response.text().await?;

        if status.is_success() {
            match serde_json::from_str(&body) {
                Ok(resp) => Ok(resp),
                Err(e) => {
                    eprintln!("Failed to parse response: {}", e);
                    eprintln!("Response body: {}", body);
                    Err(anyhow::anyhow!("Invalid response format: {}", e))
                }
            }
        } else {
            // Try to parse error response
            if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&body) {
                if let Some(message) = error_json.get("message").and_then(|v| v.as_str()) {
                    return Err(anyhow::anyhow!("{}", message));
                }
                if let Some(error) = error_json.get("error").and_then(|v| v.as_str()) {
                    return Err(anyhow::anyhow!("{}", error));
                }
            }
            Err(anyhow::anyhow!("Failed to connect device ({}): {}", status, body))
        }
    }

    pub async fn send_notification(&self, token: &str, notification: NotificationRequest) -> Result<()> {
        let url = format!("{}/api/device/notification", self.base_url);
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .json(&notification)
            .send()
            .await?;

        if !response.status().is_success() {
            let body = response.text().await?;
            return Err(anyhow::anyhow!("Failed to send notification: {}", body));
        }

        Ok(())
    }

    pub async fn update_device_info(&self, token: &str, battery_level: u8, network_speed: u32) -> Result<()> {
        let url = format!("{}/api/device/info/update", self.base_url);
        let body = json!({
            "batteryLevel": battery_level,
            "networkInfo": "Wi-Fi",
            "timestamp": chrono::Utc::now().timestamp_millis(),
            "ethernetSpeed": network_speed,
        });

        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let body = response.text().await?;
            return Err(anyhow::anyhow!("Failed to update device info: {}", body));
        }

        Ok(())
    }

    pub async fn ping(&self, token: Option<&str>) -> Result<()> {
        let url = format!("{}/api/device/ping", self.base_url);
        let mut request = self.client.get(&url);
        
        if let Some(t) = token {
            request = request.header("x-device-token", t);
        }
        
        let response = request
            .timeout(std::time::Duration::from_millis(20))
            .send()
            .await?;

        if !response.status().is_success() {
            let body = response.text().await?;
            return Err(anyhow::anyhow!("Failed to ping: {}", body));
        }

        Ok(())
    }

    pub async fn health_check(&self, token: &str, battery_level: u8) -> Result<()> {
        let url = format!("{}/api/device/health-check", self.base_url);
        let body = json!({
            "batteryLevel": battery_level,
            "timestamp": chrono::Utc::now().timestamp_millis(),
        });

        let response = self.client
            .post(&url)
            .header("x-device-token", token)
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let body = response.text().await?;
            return Err(anyhow::anyhow!("Failed health check: {}", body));
        }

        Ok(())
    }
}