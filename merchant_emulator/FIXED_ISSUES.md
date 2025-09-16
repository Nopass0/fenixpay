# Fixed Issues

## 1. Rate Field Error
**Problem**: API was rejecting transactions with error "Expected number" for the rate field when it was `null`.

**Solution**: Modified the transaction creation to always provide a rate value:
- For USDT transactions: Uses the merchant's configured rate (default 95.0)
- For RUB transactions: Uses rate of 1.0

## 2. Data Persistence
**Already Working**: The merchant emulator already saves and loads:
- Merchants with their API keys (`~/.merchant-emulator/data/merchants.json`)
- Devices with their codes (`~/.merchant-emulator/data/devices.json`)
- Transaction history (`~/.merchant-emulator/data/transactions.json`)

All data is automatically loaded on startup, so merchants and devices persist across restarts.

## 3. Quiet Mode Features (Previously Implemented)
- **Start Traffic (Quiet Mode)**: Runs traffic without any console logs
- **Start Traffic (With Logs)**: Runs traffic with full logging
- **View Traffic Logs**: Interactive log viewer (press 'q' or ESC to exit)
- Menu shows traffic status: "Traffic Running (Quiet Mode)" or "Traffic Running"

## How to Test
1. Run `cargo run --release` in an interactive terminal
2. Create a merchant if none exist
3. Start traffic in either mode
4. Restart the application - your merchants and devices will still be there