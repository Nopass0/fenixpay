import { db } from '../src/db'

async function deleteAllTransactions() {
  console.log('=== DELETING ALL TRANSACTIONS ===\n')

  // 1. Удаляем все транзакции
  console.log('Deleting all transactions...')
  const deleted = await db.transaction.deleteMany()
  console.log(`✓ Deleted ${deleted.count} transactions`)

  // 2. Сбрасываем заморозку, прибыль и устанавливаем баланс 1200 USDT
  console.log('\nResetting frozen amounts, profit and setting balance to 1200 USDT...')
  const traders = await db.user.updateMany({
    where: {
      email: { in: ['trader@test.com', 'trader@example.com'] }
    },
    data: {
      frozenUsdt: 0,
      profitFromDeals: 0,
      trustBalance: 1200
    }
  })
  console.log(`✓ Reset frozen amounts, profit and set balance to 1200 USDT for ${traders.count} traders`)

  // 3. Показываем текущее состояние трейдеров
  console.log('\n=== CURRENT TRADER BALANCES ===')
  const traderList = await db.user.findMany({
    where: {
      email: { in: ['trader@test.com', 'trader@example.com'] }
    },
    select: {
      email: true,
      trustBalance: true,
      frozenUsdt: true,
      profitFromDeals: true
    }
  })

  for (const trader of traderList) {
    console.log(`\n${trader.email}:`)
    console.log(`  Trust Balance: ${trader.trustBalance} USDT`)
    console.log(`  Frozen: ${trader.frozenUsdt} USDT`)
    console.log(`  Available: ${(trader.trustBalance - trader.frozenUsdt).toFixed(2)} USDT`)
    console.log(`  Profit from deals: ${trader.profitFromDeals} USDT`)
  }

  console.log('\n✅ All transactions deleted!')
}

deleteAllTransactions().catch(console.error).finally(() => process.exit(0))