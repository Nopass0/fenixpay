# Device API Documentation

## Overview

The Device API allows external devices to connect to bank requisites and send notifications. This API is designed for Android devices that need to monitor and report notifications from various applications.

## Base URL

All device API endpoints are available at:

```
https://voicecxr.pro/api/device
```

## Authentication

### Device Connection

To connect a device, you need a device code (which is the bank detail ID). After successful connection, you'll receive a Bearer token for subsequent requests.

### Bearer Token

After connecting, all requests must include the authentication token in the header:

```
Authorization: Bearer <your-device-token>
```

## Endpoints

### 1. Connect Device

Connect a new device to a bank requisite.

**Endpoint:** `POST /api/device/connect`

**Request Body:**
```json
{
  "deviceCode": "string",      // Bank detail ID
  "batteryLevel": 85,          // Current battery percentage
  "networkInfo": "Wi-Fi",      // Network connection type
  "deviceModel": "Google Pixel 7",  // Device model
  "androidVersion": "13",      // Android version
  "appVersion": "1.0"          // Your app version
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Device connected successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "status": "error",
  "message": "Invalid device code or no available bank details to assign to device"
}
```

### 2. Update Device Info

Update device information periodically.

**Endpoint:** `POST /api/device/info/update`

**Headers:**
```
Authorization: Bearer <your-device-token>
```

**Request Body (all fields are optional):**
```json
{
  "batteryLevel": 75,         // Battery percentage
  "isCharging": true,         // Is device charging
  "networkInfo": "Mobile Data (4G)",  // Network type
  "timestamp": 1716717635423, // Unix timestamp in milliseconds
  "deviceModel": "Google Pixel 7",
  "androidVersion": "13",
  "type": "STATUS_UPDATE",    // Custom type field
  "energy": 85,               // Alternative to batteryLevel
  "ethernetSpeed": 100,       // Network speed in Mbps
  "location": "37.7749,-122.4194",  // GPS coordinates
  "additionalInfo": "{\"temperature\":25,\"humidity\":60}"  // JSON string
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Device info updated"
}
```

### 3. Send Notification

Send a notification from the device to be stored on the server.

**Endpoint:** `POST /api/device/notification`

**Headers:**
```
Authorization: Bearer <your-device-token>
```

**Request Body:**
```json
{
  "packageName": "com.example.app",    // Package name of the app
  "appName": "Example App",            // Display name of the app
  "title": "New Message",              // Notification title
  "content": "Hello, how are you?",    // Notification content
  "timestamp": 1716717645212,          // Unix timestamp in milliseconds
  "priority": 1,                       // Priority level
  "category": "msg"                    // Notification category
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Notification received"
}
```

## Trader API Endpoints

These endpoints are used by traders to manage device connections and view notifications.

### 1. Get Device Notifications

Get all notifications from a device connected to a bank requisite.

**Endpoint:** `GET /api/trader/bank-details/{bankDetailId}/device/notifications`

**Headers:**
```
x-trader-token: <trader-token>
```

**Response (200 OK):**
```json
{
  "deviceId": "cuid123",
  "deviceName": "Google Pixel 7",
  "isOnline": true,
  "notifications": [
    {
      "id": "notif123",
      "type": "AppNotification",
      "application": "WhatsApp",
      "title": "New Message",
      "message": "You have a new message",
      "metadata": {
        "packageName": "com.whatsapp",
        "timestamp": 1716717645212,
        "priority": 1,
        "category": "msg"
      },
      "isRead": false,
      "createdAt": "2024-05-26T12:34:56.789Z"
    }
  ]
}
```

### 2. Disconnect Device

Disconnect and remove a device from a bank requisite.

**Endpoint:** `DELETE /api/trader/bank-details/{bankDetailId}/device`

**Headers:**
```
x-trader-token: <trader-token>
```

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Устройство успешно отключено"
}
```

### 3. Mark Notifications as Read

Mark specific notifications as read.

**Endpoint:** `PATCH /api/trader/bank-details/{bankDetailId}/device/notifications/mark-read`

**Headers:**
```
x-trader-token: <trader-token>
```

**Request Body:**
```json
{
  "notificationIds": ["notif123", "notif456"]
}
```

**Response (200 OK):**
```json
{
  "ok": true
}
```

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Unauthorized: Missing or invalid token"
}
```

### 404 Not Found
```json
{
  "error": "Реквизит не найден"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Internal server error occurred"
}
```

## Implementation Example (Android)

```kotlin
// Connect device
val connectRequest = DeviceConnectRequest(
    deviceCode = bankDetailId,
    batteryLevel = getBatteryLevel(),
    networkInfo = getNetworkType(),
    deviceModel = Build.MODEL,
    androidVersion = Build.VERSION.RELEASE,
    appVersion = BuildConfig.VERSION_NAME
)

val response = apiClient.connectDevice(connectRequest)
val token = response.token

// Save token for future requests
saveToken(token)

// Send notification
val notification = NotificationRequest(
    packageName = packageName,
    appName = getAppName(packageName),
    title = sbn.notification.extras.getString("android.title"),
    content = sbn.notification.extras.getString("android.text"),
    timestamp = System.currentTimeMillis(),
    priority = sbn.notification.priority,
    category = sbn.notification.category ?: "other"
)

apiClient.sendNotification("Bearer $token", notification)
```

## Best Practices

1. **Connection Management**
   - Store the device token securely
   - Implement automatic reconnection on token expiration
   - Handle network failures gracefully

2. **Battery Optimization**
   - Update device info every 5-10 minutes, not more frequently
   - Batch notifications if possible
   - Reduce update frequency when battery is low

3. **Error Handling**
   - Implement exponential backoff for failed requests
   - Queue notifications locally when offline
   - Sync queued notifications when connection is restored

4. **Security**
   - Never expose the device token in logs
   - Use HTTPS for all requests
   - Validate SSL certificates

## Rate Limits

- Device info updates: Maximum 1 request per minute
- Notifications: Maximum 100 per hour per device
- Connection attempts: Maximum 5 per hour per bank detail

## Automatic Transaction Matching

The system includes an automatic transaction matching service that processes incoming notifications from banking apps. When a notification is received, the system:

1. **Extracts the bank and amount** from the notification using regex patterns specific to each bank
2. **Matches the notification** with pending transactions based on:
   - Bank type (must match between notification package and bank detail)
   - Amount (exact match or within ±1 RUB tolerance)
   - Transaction status (must be IN_PROGRESS)
   - Transaction type (must be IN/payin)
   - Trader ID (must match the bank detail owner)

3. **Automatically completes the transaction** if a match is found:
   - Updates transaction status to READY
   - Marks the notification as read
   - Sends callback to merchant

### Supported Banks

The following banks are supported for automatic matching:

| Bank | Package Name | Pattern Example |
|------|--------------|-----------------|
| Ак Барс | ru.akbars.mobile | "Пополнение. Карта *** 6123. Сумма: 20 187.00 RUR" |
| Тинькофф | com.idamob.tinkoff.android | "Пополнение на 4 000 ₽, счёт RUB" |
| Сбербанк | ru.sberbankmobile | "Пополнение карты ****1234 на 3 500 ₽" |
| ВТБ | ru.vtb24.mobilebanking.android | "Пополнение карты *1234 на 5 000 ₽" |
| Альфа-Банк | ru.alfabank.mobile.android | "Пополнение 9 000 ₽ карта 1234" |
| Газпромбанк | ru.gazprombank.android.mobilebank.app | "Пополнение 12 345 ₽ карта *5678" |
| Райффайзен | ru.raiffeisen.mobile.new | "Пополнение/Перевод + amount" |
| Почта Банк | ru.pochta.bank | "Пополнение/Перевод + amount" |
| И другие... | | |

### Notification Format Requirements

For automatic matching to work, notifications must:
- Contain the word "Пополнение" or "Перевод"
- Include the amount in RUB format (with ₽ or RUR)
- Come from a recognized banking app package