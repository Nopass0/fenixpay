import { db } from '../src/db'

async function fullTraderCheck() {
  console.log('=== FULL TRADER CHECK ===\n')

  // 1. Найдем трейдера
  const trader = await db.user.findUnique({
    where: { email: 'trader@test.com' },
    include: {
      sessions: {
        where: {
          expiredAt: { gt: new Date() }
        }
      }
    }
  })

  if (!trader) {
    console.log('❌ Trader not found!')
    return
  }

  console.log('1. Trader Info:')
  console.log('   ID:', trader.id)
  console.log('   Name:', trader.name)
  console.log('   Email:', trader.email)
  console.log('   Trust Balance:', trader.trustBalance)
  console.log('   Frozen USDT:', trader.frozenUsdt)
  console.log('   Available:', trader.trustBalance - trader.frozenUsdt)
  console.log('   Traffic Enabled:', trader.trafficEnabled)
  console.log('   Banned:', trader.banned)
  console.log('   Active Sessions:', trader.sessions.length)

  // 2. Проверим транзакции
  const transactions = await db.transaction.findMany({
    where: { traderId: trader.id },
    include: {
      merchant: true,
      method: true,
      requisites: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  console.log('\n2. Transactions:', transactions.length, 'found')
  
  if (transactions.length === 0) {
    console.log('❌ No transactions found! Checking why...')
    
    // Проверим все транзакции
    const allTransactions = await db.transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
    
    console.log('   Total transactions in DB:', allTransactions.length)
    console.log('   First transaction traderId:', allTransactions[0]?.traderId)
    console.log('   Trader ID:', trader.id)
    console.log('   IDs match?', allTransactions[0]?.traderId === trader.id)
  } else {
    transactions.forEach((tx, idx) => {
      console.log(`\n   ${idx + 1}. Transaction #${tx.numericId}:`)
      console.log(`      Amount: ${tx.amount} RUB`)
      console.log(`      Status: ${tx.status}`)
      console.log(`      Merchant: ${tx.merchant?.name}`)
      console.log(`      Method: ${tx.method?.name}`)
      console.log(`      Bank: ${tx.requisites?.bankType}`)
      console.log(`      Card: ${tx.requisites?.cardNumber}`)
      console.log(`      Frozen: ${tx.frozenUsdtAmount || 0} USDT`)
    })
  }

  // 3. Проверим TraderMerchant связи
  const traderMerchants = await db.traderMerchant.findMany({
    where: { traderId: trader.id },
    include: {
      merchant: true,
      method: true
    }
  })

  console.log('\n3. Trader-Merchant Relationships:', traderMerchants.length)
  if (traderMerchants.length === 0) {
    console.log('❌ No merchant relationships! Transactions won\'t be assigned to this trader!')
  } else {
    traderMerchants.forEach(tm => {
      console.log(`   - Merchant: ${tm.merchant.name}, Method: ${tm.method.name}`)
    })
  }

  // 4. Итоговая проверка
  console.log('\n=== SUMMARY ===')
  const issues = []
  
  if (trader.banned) issues.push('Trader is banned')
  if (!trader.trafficEnabled) issues.push('Traffic is disabled')
  if (trader.sessions.length === 0) issues.push('No active sessions')
  if (transactions.length === 0) issues.push('No transactions assigned')
  if (traderMerchants.length === 0) issues.push('No merchant relationships')
  if (trader.trustBalance - trader.frozenUsdt <= 0) issues.push('No available balance')
  
  if (issues.length > 0) {
    console.log('❌ Issues found:')
    issues.forEach(issue => console.log(`   - ${issue}`))
  } else {
    console.log('✅ Everything looks good!')
  }
}

fullTraderCheck().catch(console.error).finally(() => process.exit(0))