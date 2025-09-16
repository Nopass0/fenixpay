import { db } from '../src/db'

async function debugTraderView() {
  console.log('=== DEBUGGING TRADER VIEW ===\n')

  // 1. Check trader
  const trader = await db.user.findUnique({
    where: { email: 'trader@test.com' },
    select: {
      id: true,
      email: true,
      name: true,
      balanceUsdt: true,
      frozenUsdt: true,
      trustBalance: true,
      trafficEnabled: true,
      banned: true
    }
  })
  
  console.log('1. Trader Info:')
  console.log(trader)
  
  if (!trader) {
    console.log('ERROR: Trader not found!')
    return
  }

  // 2. Check active sessions
  const sessions = await db.session.findMany({
    where: { 
      userId: trader.id,
      expiredAt: { gt: new Date() }
    },
    select: {
      token: true,
      expiredAt: true,
      createdAt: true
    }
  })
  
  console.log('\n2. Active Sessions:', sessions.length)
  if (sessions.length > 0) {
    console.log('Latest session token:', sessions[0].token.substring(0, 20) + '...')
  }

  // 3. Check transactions
  const transactions = await db.transaction.findMany({
    where: { traderId: trader.id },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      merchant: true,
      method: true,
      requisites: true
    }
  })
  
  console.log('\n3. Recent Transactions:', transactions.length)
  transactions.forEach(tx => {
    console.log(`\n- Transaction #${tx.numericId}:`)
    console.log(`  Amount: ${tx.amount} RUB`)
    console.log(`  Status: ${tx.status}`)
    console.log(`  Merchant: ${tx.merchant?.name}`)
    console.log(`  Method: ${tx.method?.name}`)
    console.log(`  Requisites: ${tx.requisites?.cardNumber || 'None'}`)
    console.log(`  Created: ${tx.createdAt}`)
    console.log(`  Frozen USDT: ${tx.frozenUsdtAmount || 0}`)
  })

  // 4. Check TraderMerchant relationships
  const traderMerchants = await db.traderMerchant.findMany({
    where: { traderId: trader.id },
    include: {
      merchant: true,
      method: true
    }
  })
  
  console.log('\n4. Trader-Merchant Relationships:', traderMerchants.length)
  traderMerchants.forEach(tm => {
    console.log(`- Merchant: ${tm.merchant.name}, Method: ${tm.method.name}, Active: ${tm.isActive}`)
  })

  // 5. Check bank details (requisites)
  const bankDetails = await db.bankDetail.findMany({
    where: { 
      userId: trader.id,
      isArchived: false
    }
  })
  
  console.log('\n5. Active Bank Details:', bankDetails.length)
  bankDetails.forEach(bd => {
    console.log(`- ${bd.bankType}: ${bd.cardNumber} (${bd.recipientName})`)
  })

  // 6. Summary
  console.log('\n=== SUMMARY ===')
  console.log('✓ Trader exists and is active:', !trader.banned && trader.trafficEnabled)
  console.log('✓ Has active sessions:', sessions.length > 0)
  console.log('✓ Has transactions:', transactions.length > 0)
  console.log('✓ Has merchant relationships:', traderMerchants.length > 0)
  console.log('✓ Has bank details:', bankDetails.length > 0)
  console.log('✓ Balance available:', trader.balanceUsdt - trader.frozenUsdt)
  
  // 7. Check what the frontend would see
  console.log('\n=== FRONTEND VIEW ===')
  console.log('Balance shown in sidebar:', trader.balanceUsdt.toFixed(2), 'USDT')
  console.log('Frozen shown in sidebar:', trader.frozenUsdt.toFixed(2), 'USDT')
  console.log('Available balance:', (trader.balanceUsdt - trader.frozenUsdt).toFixed(2), 'USDT')
  console.log('Transactions should show:', transactions.length, 'items')
}

debugTraderView().catch(console.error).finally(() => process.exit(0))