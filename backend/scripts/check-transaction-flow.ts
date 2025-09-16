import { db } from '../src/db'

async function checkTransactionFlow() {
  console.log('=== CHECKING TRANSACTION FLOW ===\n')

  // 1. Проверяем мерчантов
  console.log('1. Active merchants:')
  const merchants = await db.merchant.findMany({
    where: {
      disabled: false,
      banned: false
    }
  })
  merchants.forEach(m => {
    console.log(`   - ${m.name} (ID: ${m.id})`)
  })

  // 2. Проверяем активные методы
  console.log('\n2. Active payment methods:')
  const methods = await db.method.findMany({
    where: {
      isEnabled: true,
      type: { in: ['c2c', 'sbp'] }
    }
  })
  methods.forEach(m => {
    console.log(`   - ${m.name} (${m.type}), Rate source: ${m.rateSource}`)
  })

  // 3. Проверяем TraderMerchant связи
  console.log('\n3. TraderMerchant relationships:')
  const traderMerchants = await db.traderMerchant.findMany({
    include: {
      trader: true,
      merchant: true,
      method: true
    }
  })
  
  const groupedByTrader = traderMerchants.reduce((acc, tm) => {
    const key = tm.trader.email
    if (!acc[key]) acc[key] = []
    acc[key].push(`${tm.merchant.name} - ${tm.method.name}`)
    return acc
  }, {} as Record<string, string[]>)

  Object.entries(groupedByTrader).forEach(([email, relationships]) => {
    console.log(`   ${email}:`)
    relationships.forEach(r => console.log(`     - ${r}`))
  })

  // 4. Проверяем трейдеров
  console.log('\n4. Trader status:')
  const traders = await db.user.findMany({
    where: {
      email: { in: ['trader@test.com', 'trader@example.com'] }
    }
  })
  
  traders.forEach(t => {
    console.log(`   ${t.email}:`)
    console.log(`     - Traffic enabled: ${t.trafficEnabled}`)
    console.log(`     - Banned: ${t.banned}`)
    console.log(`     - Trust balance: ${t.trustBalance}`)
    console.log(`     - Frozen: ${t.frozenUsdt}`)
  })

  // 5. Проверяем активные реквизиты
  console.log('\n5. Active bank details:')
  for (const trader of traders) {
    const bankDetails = await db.bankDetail.findMany({
      where: {
        userId: trader.id,
        isArchived: false
      }
    })
    console.log(`   ${trader.email}: ${bankDetails.length} active requisites`)
    bankDetails.forEach(bd => {
      console.log(`     - ${bd.bankType}: ${bd.cardNumber}`)
    })
  }

  // 6. Проверяем последние транзакции
  console.log('\n6. Recent transactions:')
  const recentTx = await db.transaction.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      trader: true,
      merchant: true
    }
  })
  
  if (recentTx.length === 0) {
    console.log('   No transactions found')
  } else {
    recentTx.forEach(tx => {
      console.log(`   #${tx.numericId}: ${tx.amount} RUB, Status: ${tx.status}, Trader: ${tx.trader?.email || 'NONE'}`)
    })
  }

  // 7. Проверяем системные настройки
  console.log('\n7. System settings:')
  const kkkSetting = await db.systemConfig.findUnique({
    where: { key: 'kkk_percent' }
  })
  console.log(`   KKK percent: ${kkkSetting?.value || 'NOT SET'}%`)

  // 8. Анализ проблем
  console.log('\n=== POTENTIAL ISSUES ===')
  const issues = []
  
  if (merchants.length === 0) issues.push('No active merchants')
  if (methods.length === 0) issues.push('No active payment methods')
  if (traderMerchants.length === 0) issues.push('No TraderMerchant relationships')
  if (!kkkSetting) issues.push('KKK percent not configured')
  
  const tradersWithoutRequisites = traders.filter(async t => {
    const count = await db.bankDetail.count({
      where: { userId: t.id, isArchived: false }
    })
    return count === 0
  })
  
  if (tradersWithoutRequisites.length > 0) {
    issues.push('Some traders have no bank requisites')
  }

  if (issues.length === 0) {
    console.log('✅ All systems operational')
  } else {
    console.log('❌ Issues found:')
    issues.forEach(issue => console.log(`   - ${issue}`))
  }
}

checkTransactionFlow().catch(console.error).finally(() => process.exit(0))