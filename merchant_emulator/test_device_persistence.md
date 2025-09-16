# Device Persistence Test

## Implemented Features:

1. **Persistent Device Storage**
   - Devices are saved to `data/devices.json`
   - Devices are loaded on startup
   - Device codes and tokens are preserved

2. **Global Device Manager**
   - Single instance shared across the application
   - Devices remain in memory when exiting Device Menu

3. **Persistent Ping Services**
   - Ping services continue running when exiting Device Menu
   - Connected devices are automatically reconnected on startup
   - Health check every 20ms to keep connection alive

4. **Connect All Devices**
   - New menu option to connect all disconnected devices
   - Uses saved device codes from previous connections
   - Batch connection with progress reporting

## Test Steps:

1. Start the merchant emulator
2. Go to Device Emulator menu
3. Create a few devices
4. Connect them with device codes
5. Exit Device Menu - devices should keep pinging
6. Re-enter Device Menu - devices should still be connected
7. Exit and restart the program
8. Go to Device Emulator - devices should be loaded
9. Use "Connect All Devices" to reconnect them

## Key Changes:

- DeviceManager now saves/loads from disk
- Device tokens and codes are preserved on disconnect
- Ping services are not stopped when exiting menu
- Global instances ensure persistence across menu navigation