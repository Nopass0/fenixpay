# Merchant Emulator Features

## Overview
The Merchant Emulator is a comprehensive tool for testing P2P payment transactions with the Chase platform. It supports multiple merchants, devices, and traffic generation modes.

## Key Features

### 1. **Quiet Mode Traffic Generation**
- **Start Traffic (Quiet Mode)**: Runs traffic silently without any console logs
- **Start Traffic (With Logs)**: Shows all transaction logs in real-time
- **View Traffic Logs**: Interactive log viewer (press 'q' or ESC to exit)

### 2. **Data Persistence**
All data is automatically saved and loaded between sessions:
- Merchants with API keys: `~/.merchant-emulator/data/merchants.json`
- Devices with codes: `~/.merchant-emulator/data/devices.json`
- Transaction history: `~/.merchant-emulator/data/transactions.json`

### 3. **Multi-Merchant Support**
- Create multiple merchants with different configurations
- Each merchant has independent:
  - API key
  - Balance tracking
  - Payment type (RUB/USDT)
  - Liquidity settings
  - Traffic configuration

### 4. **Traffic Configuration**
Customize traffic generation per merchant:
- Request interval (with variance)
- Transaction amount ranges with probabilities
- Maximum transaction limits
- Mock vs liquid transactions

### 5. **Device Management**
- Register virtual devices
- Automatic device persistence
- Ping service for device health monitoring
- Transaction notifications to devices

### 6. **Statistics & Monitoring**
- Real-time transaction statistics
- Success/failure rates
- Error breakdown analysis
- Export data to JSON/CSV

## Usage Examples

### Start Traffic Quietly
```
1. Select merchant
2. Choose "Start Traffic (Quiet Mode)"
3. Traffic runs in background without logs
```

### View Traffic Logs
```
1. Start traffic with logs
2. Select "View Traffic Logs"
3. Press 'q' or ESC to return to menu
```

### Data Persistence
```
- Create merchants/devices
- Exit application
- Restart - all data is preserved
```

## Technical Details

### Rate Handling
- RUB transactions: rate = 1.0
- USDT transactions: configurable rate (default 95.0)

### API Integration
- Automatic retry on failures
- Detailed error logging
- Support for both mock and liquid transactions

### Background Services
- Callback server on port 8080
- Device ping service
- Traffic generator with configurable intervals