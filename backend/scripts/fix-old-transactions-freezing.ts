import { db } from '../src/db'

async function fixOldTransactionsFreezing() {
  console.log('=== Fixing freezing for old transactions ===\n')

  // 1. Найдем транзакции trader@example.com без заморозки
  const trader = await db.user.findUnique({
    where: { email: 'trader@example.com' }
  })

  if (!trader) {
    console.log('Trader not found')
    return
  }

  // 2. Найдем транзакции без frozenUsdtAmount
  const transactions = await db.transaction.findMany({
    where: {
      traderId: trader.id,
      status: 'IN_PROGRESS',
      type: 'IN',
      frozenUsdtAmount: null
    }
  })

  console.log(`Found ${transactions.length} transactions without freezing`)

  // 3. Пересчитаем заморозку правильно
  let totalNewFrozen = 0
  const currentFrozen = trader.frozenUsdt

  // Получаем все транзакции с заморозкой для полного пересчета
  const allTransactions = await db.transaction.findMany({
    where: {
      traderId: trader.id,
      status: 'IN_PROGRESS',
      type: 'IN'
    }
  })

  console.log(`Total IN_PROGRESS transactions: ${allTransactions.length}`)

  // 4. Пересчитываем полную заморозку
  for (const tx of allTransactions) {
    if (tx.frozenUsdtAmount && tx.calculatedCommission) {
      totalNewFrozen += tx.frozenUsdtAmount + tx.calculatedCommission
    }
  }

  console.log(`Current frozen in DB: ${currentFrozen}`)
  console.log(`Calculated frozen from transactions: ${totalNewFrozen}`)

  // 5. Обновляем значение frozenUsdt у трейдера
  const updated = await db.user.update({
    where: { id: trader.id },
    data: {
      frozenUsdt: totalNewFrozen,
      balanceUsdt: 0 // Обнуляем, так как не используем
    }
  })

  console.log(`\n✅ Updated:`)
  console.log(`   Trust Balance: ${updated.trustBalance}`)
  console.log(`   Frozen USDT: ${updated.frozenUsdt}`)
  console.log(`   Available: ${(updated.trustBalance - updated.frozenUsdt).toFixed(2)}`)
}

fixOldTransactionsFreezing().catch(console.error).finally(() => process.exit(0))