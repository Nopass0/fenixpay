# NO_REQUISITE Error Explained

The NO_REQUISITE error occurs when the backend cannot find a suitable bank card/requisite to process the transaction. This can happen for several reasons:

## Common Causes

### 1. No Available Bank Details
- No traders have registered bank cards for the requested payment method
- All available bank cards are currently being used for other transactions

### 2. Insufficient Trader Balance
- The trader's available balance (trustBalance - frozenUsdt) is less than the required amount
- The system needs to freeze funds during transaction processing

### 3. Transaction Limits Exceeded
- Bank details can have daily transaction count limits (maxCountTransactions)
- If a bank card has reached its daily limit, it won't be selected

### 4. Amount Range Restrictions
- Bank details can have min/max amount limits
- Transactions outside these ranges will be rejected

## How to Fix

### For Testing/Development:
1. **Create Traders with Bank Cards**: Use the backend admin panel or API to create traders and register their bank cards
2. **Ensure Sufficient Balance**: Make sure traders have enough trustBalance to cover transactions
3. **Check Payment Methods**: Verify that the payment method ID you're using has bank cards registered
4. **Use Mock Transactions**: Set `is_mock: true` in your requests to bypass real bank card requirements

### For Production:
1. Ensure traders are properly onboarded with valid bank cards
2. Monitor trader balances and top them up as needed
3. Configure appropriate transaction limits on bank cards
4. Have multiple traders/bank cards available for redundancy

## Current Status
Based on the transaction logs, all transactions are failing with NO_REQUISITE, which indicates:
- No traders with bank cards are currently available in the system
- OR all available traders have insufficient balance
- OR the payment method `cmdmyxs2f0004ikluna3zocy5` has no registered bank cards