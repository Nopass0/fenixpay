# Summary of Fixes Implemented

## 1. ✅ Fixed Permission Denied Error
**Problem**: Application was trying to use system directories (`~/Загрузки`) that required elevated permissions.

**Solution**: Changed default directories to user-writable locations:
- Data directory: `~/.merchant-emulator/data`
- Export directory: `~/.merchant-emulator/exports`

## 2. ✅ Fixed Rate Validation Error
**Problem**: API was rejecting transactions with `null` rate field.

**Solution**: Modified transaction creation to always provide a rate:
- RUB transactions: rate = 1.0
- USDT transactions: rate = merchant's configured rate (default 95.0)

## 3. ✅ Fixed Crypto Field Validation Error
**Problem**: The crypto field was causing validation errors due to custom deserializer issues.

**Solution**: Removed custom deserializer and used standard serde handling with proper optional field handling.

## 4. ✅ Implemented Quiet Mode for Traffic Generation
**Features Added**:
- "Start Traffic (Quiet Mode)" - Runs traffic without any console logs
- "Start Traffic (With Logs)" - Runs traffic with full logging
- Traffic status shown in merchant menu
- All logs are sent through channels instead of direct printing

## 5. ✅ Implemented Interactive Log Viewer
**Features Added**:
- "View Traffic Logs" menu option (only available when traffic is running with logs)
- Interactive terminal viewer using crossterm
- Exit with 'q' or ESC keys
- Properly integrated with traffic generator through channels

## 6. ✅ Fixed Log Viewer Exit Functionality
**Problem**: Log viewer wasn't properly connected to traffic generator and exit wasn't working.

**Solution**: 
- Created proper channel integration between traffic generator and log viewer
- Each merchant gets its own log channel when traffic starts
- Log viewer properly receives logs from the traffic generator
- Exit functionality works correctly with 'q' or ESC keys

## 7. 📝 Documented NO_REQUISITE Error
**Issue**: All transactions failing with NO_REQUISITE error.

**Explanation**: This error occurs when the backend cannot find suitable bank cards/requisites. Common causes:
- No traders with bank cards registered
- Insufficient trader balance
- Transaction limits exceeded
- No bank cards for the specific payment method

**Documentation**: Created NO_REQUISITE_ERROR_EXPLAINED.md with detailed explanation and solutions.

## Files Modified
- `/src/models/config.rs` - Fixed default directories
- `/src/models/transaction.rs` - Fixed crypto field handling
- `/src/services/merchant_service.rs` - Fixed rate handling
- `/src/services/traffic_generator.rs` - Added quiet mode and log channel support
- `/src/services/log_capture.rs` - Created log capture service (for future use)
- `/src/ui/log_viewer.rs` - Implemented interactive log viewer
- `/src/ui/merchant_menu.rs` - Added quiet mode options
- `/src/main.rs` - Integrated log viewer with traffic generator
- Various documentation files updated