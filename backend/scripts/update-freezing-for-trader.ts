import { db } from '../src/db'

async function updateFreezingForTrader() {
  console.log('=== Updating freezing for trader@example.com ===\n')

  // 1. Найдем трейдера
  const trader = await db.user.findUnique({
    where: { email: 'trader@example.com' }
  })

  if (!trader) {
    console.log('❌ Trader not found!')
    return
  }

  // 2. Найдем все его IN_PROGRESS транзакции
  const transactions = await db.transaction.findMany({
    where: {
      traderId: trader.id,
      status: 'IN_PROGRESS',
      type: 'IN'
    }
  })

  console.log(`Found ${transactions.length} IN_PROGRESS transactions`)

  // 3. Посчитаем общую заморозку
  let totalFrozen = 0
  for (const tx of transactions) {
    if (tx.frozenUsdtAmount && tx.calculatedCommission) {
      totalFrozen += tx.frozenUsdtAmount + tx.calculatedCommission
    }
  }

  console.log(`Total frozen from transactions: ${totalFrozen.toFixed(2)} USDT`)
  console.log(`Current frozenUsdt in DB: ${trader.frozenUsdt}`)

  // 4. Обновим frozenUsdt трейдера
  const updated = await db.user.update({
    where: { id: trader.id },
    data: {
      frozenUsdt: totalFrozen
    }
  })

  console.log(`\n✅ Updated trader:`)
  console.log(`   Trust Balance: ${updated.trustBalance}`)
  console.log(`   Frozen USDT: ${updated.frozenUsdt}`)
  console.log(`   Available: ${(updated.trustBalance - updated.frozenUsdt).toFixed(2)}`)
}

updateFreezingForTrader().catch(console.error).finally(() => process.exit(0))