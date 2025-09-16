import { db } from '../src/db'

async function assignTransactionsToTrader() {
  console.log('=== Assigning transactions to trader@example.com ===\n')

  // 1. Найдем трейдера
  const trader = await db.user.findUnique({
    where: { email: 'trader@example.com' }
  })

  if (!trader) {
    console.log('❌ Trader not found!')
    return
  }

  console.log('Trader ID:', trader.id)
  console.log('Trust Balance:', trader.trustBalance)

  // 2. Найдем транзакции без трейдера или с другим трейдером
  const availableTransactions = await db.transaction.findMany({
    where: {
      type: 'IN',
      status: { in: ['CREATED', 'IN_PROGRESS'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      method: true
    }
  })

  console.log('\nFound', availableTransactions.length, 'transactions')

  // 3. Проверим, есть ли связи TraderMerchant для методов
  const traderMerchants = await db.traderMerchant.findMany({
    where: { traderId: trader.id },
    include: { method: true }
  })

  const methodIds = traderMerchants.map(tm => tm.methodId)
  console.log('\nTrader has access to methods:', traderMerchants.map(tm => tm.method.name).join(', '))

  // 4. Назначаем транзакции
  let assigned = 0
  for (const tx of availableTransactions) {
    // Проверяем, есть ли у трейдера доступ к этому методу
    if (methodIds.includes(tx.methodId)) {
      await db.transaction.update({
        where: { id: tx.id },
        data: { traderId: trader.id }
      })
      assigned++
      console.log(`✓ Assigned transaction #${tx.numericId} (${tx.amount} RUB)`)
      
      if (assigned >= 10) break // Назначаем не более 10 транзакций
    }
  }

  console.log(`\n✅ Assigned ${assigned} transactions to trader@example.com`)

  // 5. Проверим финальное состояние
  const finalCount = await db.transaction.count({
    where: { traderId: trader.id }
  })
  console.log('Total transactions for this trader:', finalCount)
}

assignTransactionsToTrader().catch(console.error).finally(() => process.exit(0))