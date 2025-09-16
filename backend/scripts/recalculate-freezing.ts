import { db } from '../src/db'
import { ceilUp2, calculateFreezingParams } from '../src/utils/freezing'

async function recalculateFreezing() {
  console.log('=== Recalculating freezing for trader@example.com transactions ===\n')

  // 1. Найдем трейдера
  const trader = await db.user.findUnique({
    where: { email: 'trader@example.com' }
  })

  if (!trader) {
    console.log('❌ Trader not found!')
    return
  }

  // 2. Получим настройку KKK
  const kkkSetting = await db.systemConfig.findUnique({
    where: { key: 'kkk_percent' }
  })
  const kkkPercent = kkkSetting ? parseFloat(kkkSetting.value) : 1

  console.log('KKK percent:', kkkPercent)

  // 3. Найдем все IN_PROGRESS транзакции
  const transactions = await db.transaction.findMany({
    where: {
      traderId: trader.id,
      status: 'IN_PROGRESS',
      type: 'IN'
    },
    include: {
      method: true
    }
  })

  console.log(`\nProcessing ${transactions.length} transactions...`)

  let totalFrozen = 0
  
  // 4. Обновим каждую транзакцию
  for (const tx of transactions) {
    if (!tx.rate || !tx.method) continue

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

    totalFrozen += freezingParams.totalRequired

    console.log(`✓ Transaction #${tx.numericId}: ${tx.amount} RUB -> ${freezingParams.totalRequired.toFixed(2)} USDT frozen`)
  }

  // 5. Обновим общую заморозку трейдера
  const updated = await db.user.update({
    where: { id: trader.id },
    data: {
      frozenUsdt: totalFrozen
    }
  })

  console.log(`\n✅ Done!`)
  console.log(`   Total frozen: ${totalFrozen.toFixed(2)} USDT`)
  console.log(`   Trust Balance: ${updated.trustBalance}`)
  console.log(`   Available: ${(updated.trustBalance - totalFrozen).toFixed(2)} USDT`)
}

recalculateFreezing().catch(console.error).finally(() => process.exit(0))