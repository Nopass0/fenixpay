# Payout Accounting Implementation

## Overview
Implemented proper accounting for payout amounts, currencies, and commissions as per Промпт 12.

## Key Changes

### 1. Database Schema
- Added `sumToWriteOffUSDT` field to Payout model
- This field stores the USDT amount to be credited to trader on completion

### 2. Payout Accounting Service
Created `payout-accounting.service.ts` with the following methods:

#### acceptPayoutWithAccounting
- Checks trader's RUB balance (not payout balance)
- Deducts `amountRUB` from `balanceRub`
- Adds `amountRUB` to `frozenRub`
- Calculates and stores `sumToWriteOffUSDT = totalUsdt`

#### cancelPayoutWithAccounting
- Returns payout to pool (status = CREATED)
- Returns frozen RUB to trader's balance
- Clears trader assignment and sumToWriteOffUSDT

#### completePayoutWithAccounting
- Removes RUB from frozen (consumes it)
- Adds `sumToWriteOffUSDT` to trader's `balanceUsdt`
- Updates profit tracking

#### reassignPayoutWithAccounting
- Used by redistribution service
- Checks new trader's RUB balance
- Performs same accounting as accept

### 3. API Integration
- Updated merchant API to use `completePayoutWithAccounting`
- Updated trader API to use `acceptPayoutWithAccounting` and `cancelPayoutWithAccounting`
- Redistribution service uses `reassignPayoutWithAccounting`

### 4. Balance Flow

1. **On Creation**: No balance changes
2. **On Accept**: 
   - `balanceRub` -= `amount`
   - `frozenRub` += `amount`
3. **On Cancel**: 
   - `balanceRub` += `amount` (returned)
   - `frozenRub` -= `amount`
4. **On Complete**: 
   - `frozenRub` -= `amount` (consumed)
   - `balanceUsdt` += `sumToWriteOffUSDT`

## Testing
Created comprehensive e2e tests covering:
- ✅ Scenario 1: Confirm flow (accept → confirm → complete)
- ✅ Scenario 2: Cancel flow (accept → cancel)
- ✅ Scenario 3: Reassign flow (cancel → reassign to another trader)
- ✅ Edge cases: Insufficient balance handling

All tests pass successfully.