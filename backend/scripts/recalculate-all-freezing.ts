import { db } from '../src/db'
import { calculateFreezingParams } from '../src/utils/freezing'

async function recalculateAllFreezing() {
  console.log('=== RECALCULATING FREEZING FOR ALL TRANSACTIONS ===\n')

  // 1. Получаем KKK настройку
  const kkkSetting = await db.systemConfig.findUnique({
    where: { key: 'kkk_percent' }
  })
  const kkkPercent = kkkSetting ? parseFloat(kkkSetting.value) : 1
  console.log('KKK percent:', kkkPercent)

  // 2. Найдем все транзакции без заморозки
  const transactions = await db.transaction.findMany({
    where: {
      type: 'IN',
      status: { in: ['CREATED', 'IN_PROGRESS'] },
      frozenUsdtAmount: null
    },
    include: {
      method: true,
      trader: true
    }
  })

  console.log(`\nFound ${transactions.length} transactions without freezing`)

  // 3. Группируем по трейдерам для подсчета заморозки
  const freezingByTrader: Record<string, number> = {}

  // 4. Обновляем каждую транзакцию
  for (const tx of transactions) {
    if (!tx.rate || !tx.method || !tx.trader) continue

    const freezingParams = calculateFreezingParams(
      tx.amount,
      tx.rate,
      kkkPercent,
      tx.method.commissionPayin
    )

    await db.transaction.update({
      where: { id: tx.id },
      data: {
        frozenUsdtAmount: freezingParams.frozenUsdtAmount,
        adjustedRate: freezingParams.adjustedRate,
        kkkPercent: kkkPercent,
        feeInPercent: tx.method.commissionPayin,
        calculatedCommission: freezingParams.calculatedCommission
      }
    })

    // Добавляем к общей заморозке трейдера
    if (!freezingByTrader[tx.trader.id]) {
      freezingByTrader[tx.trader.id] = 0
    }
    freezingByTrader[tx.trader.id] += freezingParams.totalRequired

    console.log(`✓ Transaction #${tx.numericId}: ${tx.amount} RUB -> ${freezingParams.totalRequired.toFixed(2)} USDT frozen`)
  }

  // 5. Обновляем заморозку у трейдеров
  console.log('\n=== UPDATING TRADER FROZEN AMOUNTS ===')
  
  for (const [traderId, totalFrozen] of Object.entries(freezingByTrader)) {
    const trader = await db.user.findUnique({
      where: { id: traderId }
    })
    
    if (trader) {
      // Добавляем к существующей заморозке
      const newFrozen = trader.frozenUsdt + totalFrozen
      
      await db.user.update({
        where: { id: traderId },
        data: { frozenUsdt: newFrozen }
      })
      
      console.log(`✓ ${trader.email}: frozen updated from ${trader.frozenUsdt} to ${newFrozen.toFixed(2)} USDT`)
    }
  }

  // 6. Финальная статистика
  console.log('\n=== FINAL STATISTICS ===')
  
  const traders = await db.user.findMany({
    where: {
      email: { in: ['trader@test.com', 'trader@example.com'] }
    }
  })

  for (const trader of traders) {
    const txCount = await db.transaction.count({
      where: {
        traderId: trader.id,
        status: { in: ['CREATED', 'IN_PROGRESS'] }
      }
    })

    console.log(`\n${trader.email}:`)
    console.log(`  Trust Balance: ${trader.trustBalance} USDT`)
    console.log(`  Frozen: ${trader.frozenUsdt.toFixed(2)} USDT`)
    console.log(`  Available: ${(trader.trustBalance - trader.frozenUsdt).toFixed(2)} USDT`)
    console.log(`  Active transactions: ${txCount}`)
  }
}

recalculateAllFreezing().catch(console.error).finally(() => process.exit(0))