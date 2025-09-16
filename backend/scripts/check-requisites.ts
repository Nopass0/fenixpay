import { db } from '../src/db'

async function checkRequisites() {
  console.log('=== CHECKING BANK REQUISITES ===\n')

  // Получаем всех трейдеров с их реквизитами
  const traders = await db.user.findMany({
    where: {
      email: { in: ['trader@test.com', 'trader@example.com'] }
    },
    include: {
      bankDetails: {
        where: { isArchived: false }
      }
    }
  })

  for (const trader of traders) {
    console.log(`\n=== ${trader.email} ===`)
    console.log(`ID: ${trader.id}`)
    console.log(`Trust Balance: ${trader.trustBalance} USDT`)
    console.log(`Frozen: ${trader.frozenUsdt} USDT`)
    console.log(`Available: ${(trader.trustBalance - trader.frozenUsdt).toFixed(2)} USDT`)
    console.log(`Min/Max per requisite: ${trader.minAmountPerRequisite}-${trader.maxAmountPerRequisite} RUB`)
    
    console.log(`\nActive Bank Details (${trader.bankDetails.length}):`)
    for (const bd of trader.bankDetails) {
      console.log(`\n  ID: ${bd.id}`)
      console.log(`  Bank: ${bd.bankType}`)
      console.log(`  Card: ${bd.cardNumber}`)
      console.log(`  Recipient: ${bd.recipientName}`)
      console.log(`  Method Type: ${bd.methodType}`)
      console.log(`  Limits: ${bd.minAmount}-${bd.maxAmount} RUB`)
      console.log(`  Daily limit: ${bd.dailyLimit} RUB`)
      console.log(`  Monthly limit: ${bd.monthlyLimit} RUB`)
      console.log(`  Max transactions: ${bd.maxCountTransactions}`)
      console.log(`  Interval: ${bd.intervalMinutes} min`)
      
      // Проверяем сегодняшние транзакции
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const todayTxCount = await db.transaction.count({
        where: {
          bankDetailId: bd.id,
          createdAt: { gte: today },
          status: { not: 'CANCELED' }
        }
      })
      
      const todayTxSum = await db.transaction.aggregate({
        where: {
          bankDetailId: bd.id,
          createdAt: { gte: today },
          status: { not: 'CANCELED' }
        },
        _sum: { amount: true }
      })
      
      console.log(`  Today: ${todayTxCount} transactions, ${todayTxSum._sum.amount || 0} RUB`)
    }
  }

  // Проверяем последние транзакции
  console.log('\n\n=== RECENT TRANSACTIONS ===')
  const recentTx = await db.transaction.findMany({
    where: {
      type: 'IN',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    include: {
      trader: true,
      requisites: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  for (const tx of recentTx) {
    console.log(`\nTx #${tx.numericId}:`)
    console.log(`  Amount: ${tx.amount} RUB`)
    console.log(`  Status: ${tx.status}`)
    console.log(`  Trader: ${tx.trader?.email || 'NOT ASSIGNED'}`)
    console.log(`  Bank: ${tx.requisites?.bankType || 'NONE'} ${tx.requisites?.cardNumber || ''}`)
    console.log(`  Created: ${tx.createdAt}`)
  }
}

checkRequisites().catch(console.error).finally(() => process.exit(0))