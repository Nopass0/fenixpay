# Testing Quiet Mode Traffic Generation

## How to Test the New Features

### 1. Run the Merchant Emulator
```bash
cargo run --release
```

### 2. Create a Test Merchant
- Select "Create New Merchant"
- Enter a name (e.g., "test")
- Enter the API key: `39aba9ce52058c80e7f8208fa59fa16b34bd54af6fb0847e5bcd90be78b22794`
- Set callback URL: `http://localhost:8080/callback`

### 3. Test Quiet Mode
- Select the merchant from the menu
- You'll see three options for traffic:
  - **"Start Traffic (With Logs)"** - Shows all transaction logs in the console
  - **"Start Traffic (Quiet Mode)"** - Runs traffic silently without any logs
  - **"View Traffic Logs"** - Available when traffic is running with logs

### 4. Menu Status Display
The merchant menu header will show:
- `Traffic Stopped` - When no traffic is running
- `Traffic Running` - When traffic is running with logs
- `Traffic Running (Quiet Mode)` - When traffic is running quietly

### 5. Log Viewer
When traffic is running with logs:
- Select "View Traffic Logs" to enter the log viewer
- Press `q` or `ESC` to exit the log viewer and return to the menu
- The log viewer uses an alternate screen, so your menu remains intact

## Key Features Implemented

1. **Quiet Mode**: Traffic runs without any console output
2. **Log Viewer**: Interactive viewer with exit capability (q/ESC)
3. **Dynamic Menu**: Shows current traffic status and appropriate options
4. **Background Operation**: Traffic continues running even when navigating menus

## Implementation Details

- Modified `TrafficGenerator` to accept a `quiet_mode` flag
- Added conditional logging based on quiet mode status
- Created `LogViewer` component with crossterm for terminal control
- Updated `MerchantMenu` to show traffic status and provide appropriate options