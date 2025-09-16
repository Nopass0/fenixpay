# RUB Transaction Freezing Module Implementation Summary

## Overview
Implemented a proper RUB transaction freezing mechanism that freezes USDT amounts based on adjusted rates and manages profit calculation correctly.

## Database Schema Changes

### Transaction Table
Added new fields to track freezing parameters:
- `frozenUsdtAmount` - Amount of USDT frozen for this transaction
- `adjustedRate` - Rate adjusted with KKK coefficient
- `kkkPercent` - KKK percentage at time of transaction creation
- `feeInPercent` - Fee percentage at time of transaction creation
- `calculatedCommission` - Calculated commission in USDT

### RateSettings Table
New table to store KKK (rate adjustment coefficient) per method:
- `id` - Primary key
- `methodId` - Foreign key to Method (unique)
- `kkkPercent` - Rate adjustment percentage
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

## Business Logic Implementation

### Freezing Formula
```
adjRate = rateMerchant * (1 - kkkPercent/100)
usdtFreeze = ceilUp2(amountRub / adjRate)
commission = ceilUp2(usdtFreeze * feeIn/100)
totalRequired = usdtFreeze + commission
```

### Transaction Lifecycle

#### 1. Transaction Creation (IN)
- Calculate required USDT using adjusted rate
- Check if trader has sufficient available balance (balanceUsdt - frozenUsdt)
- Create transaction with freezing parameters
- Increment trader's frozenUsdt by totalRequired

#### 2. Transaction Cancellation/Expiration
- Decrement trader's frozenUsdt by (frozenUsdtAmount + calculatedCommission)
- No balance changes

#### 3. Transaction Success (READY)
- Decrement trader's frozenUsdt by (frozenUsdtAmount + calculatedCommission)
- Decrement trader's balanceUsdt by actual spent (amountRub / merchantRate)
- Calculate profit: (frozenUsdtAmount - actualSpent) + calculatedCommission
- Increment trader's profitFromDeals by profit amount

## Files Modified

### Core Logic
- `/backend/src/utils/freezing.ts` - Utility functions for freezing calculations
- `/backend/src/routes/merchant/index.ts` - Updated transaction creation logic
- `/backend/src/routes/admin/transactions.ts` - Updated status change handling
- `/backend/src/routes/trader/transactions.ts` - Updated trader transaction completion
- `/backend/src/services/ExpiredTransactionWatcher.ts` - Updated expiration handling

### Admin Panel
- `/backend/src/routes/admin/rate-settings.ts` - New admin routes for KKK management
- `/backend/src/routes/admin.ts` - Added rate settings routes

## Migration
Created SQL migration file: `/backend/add_freezing_fields.sql`

## Key Improvements
1. **Proper Balance Management**: Now freezes from balanceUsdt to frozenUsdt instead of using trustBalance
2. **Rate Adjustment**: Implements KKK coefficient for rate adjustment
3. **Commission Calculation**: Properly calculates and tracks commission per transaction
4. **Profit Tracking**: Accurately calculates trader profit based on rate differences
5. **Atomic Operations**: All balance operations are wrapped in database transactions

## Testing Required
1. Create transaction with various KKK percentages
2. Test cancellation unfreezes correct amounts
3. Test expiration unfreezes correct amounts
4. Test successful completion calculates profit correctly
5. Test insufficient balance rejection
6. Test admin KKK settings management