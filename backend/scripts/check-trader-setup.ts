import { db } from '../src/db'

async function checkTraderSetup() {
  console.log('=== CHECKING TRADER SETUP ===\n')

  // 1. Проверим трейдеров
  const traders = await db.user.findMany({
    where: {
      email: { in: ['trader@test.com', 'trader@example.com'] }
    },
    include: {
      bankDetails: true,
      traderMerchants: {
        include: {
          merchant: true,
          method: true
        }
      }
    }
  })

  for (const trader of traders) {
    console.log(`\n=== ${trader.email} ===`)
    console.log(`ID: ${trader.id}`)
    console.log(`Trust Balance: ${trader.trustBalance} USDT`)
    console.log(`Frozen: ${trader.frozenUsdt} USDT`)
    console.log(`Available: ${(trader.trustBalance - trader.frozenUsdt).toFixed(2)} USDT`)
    
    console.log(`\nBank Details (${trader.bankDetails.length}):`)
    for (const bd of trader.bankDetails) {
      console.log(`  - ${bd.bankType} ${bd.cardNumber} (${bd.recipientName})`)
      console.log(`    Limits: ${bd.minAmount}-${bd.maxAmount} RUB`)
      console.log(`    Daily: ${bd.dailyLimit}, Monthly: ${bd.monthlyLimit}`)
      console.log(`    Archived: ${bd.isArchived}`)
    }

    console.log(`\nTrader-Merchant Links (${trader.traderMerchants.length}):`)
    for (const tm of trader.traderMerchants) {
      console.log(`  - Merchant: ${tm.merchant.name} (${tm.merchant.id})`)
      console.log(`    Method: ${tm.method.name} (${tm.method.code})`)
      console.log(`    Fee In: ${tm.feeIn}%, Fee Out: ${tm.feeOut}%`)
      console.log(`    Enabled: In=${tm.isFeeInEnabled}, Out=${tm.isFeeOutEnabled}`)
    }
  }

  // 2. Проверим мерчантов
  console.log('\n\n=== MERCHANTS ===')
  const merchants = await db.merchant.findMany({
    include: {
      merchantMethods: {
        include: {
          method: true
        }
      }
    }
  })

  for (const merchant of merchants) {
    console.log(`\n${merchant.name} (${merchant.id}):`)
    console.log(`  Token: ${merchant.token}`)
    console.log(`  Methods (${merchant.merchantMethods.length}):`)
    for (const mm of merchant.merchantMethods) {
      console.log(`    - ${mm.method.name} (${mm.method.code}): ${mm.isEnabled ? 'Enabled' : 'Disabled'}`)
    }
  }

  // 3. Проверим методы
  console.log('\n\n=== PAYMENT METHODS ===')
  const methods = await db.method.findMany()
  
  for (const method of methods) {
    console.log(`\n${method.name} (${method.code}):`)
    console.log(`  Type: ${method.type}`)
    console.log(`  Commission In: ${method.commissionPayin}%`)
    console.log(`  Limits: ${method.minPayin}-${method.maxPayin}`)
    console.log(`  Enabled: ${method.isEnabled}`)
  }

  // 4. Проверим настройки KKK
  console.log('\n\n=== SYSTEM CONFIG ===')
  const kkkSetting = await db.systemConfig.findUnique({
    where: { key: 'kkk_percent' }
  })
  console.log(`KKK Percent: ${kkkSetting?.value || 'NOT SET'}%`)
}

checkTraderSetup().catch(console.error).finally(() => process.exit(0))