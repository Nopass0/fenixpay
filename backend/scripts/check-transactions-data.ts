import { db } from '../src/db'

async function checkTransactionsData() {
  const trader = await db.user.findUnique({
    where: { email: 'trader@example.com' }
  })

  if (!trader) return

  const transactions = await db.transaction.findMany({
    where: {
      traderId: trader.id,
      status: 'IN_PROGRESS'
    },
    orderBy: { frozenUsdtAmount: 'desc' },
    take: 10
  })

  console.log('=== TRANSACTIONS WITH FREEZING DATA ===\n')
  
  transactions.forEach(tx => {
    console.log(`Transaction #${tx.numericId}:`)
    console.log(`  Amount: ${tx.amount} RUB`)
    console.log(`  Rate: ${tx.rate}`)
    console.log(`  Frozen USDT: ${tx.frozenUsdtAmount || 0}`)
    console.log(`  Commission: ${tx.calculatedCommission || 0}`)
    console.log(`  Total frozen: ${((tx.frozenUsdtAmount || 0) + (tx.calculatedCommission || 0)).toFixed(2)}`)
    console.log(`  KKK%: ${tx.kkkPercent || 0}`)
    console.log(`  Adjusted Rate: ${tx.adjustedRate || 0}`)
    console.log('')
  })
  
  // Найдем транзакции с заморозкой
  const withFreezing = transactions.filter(tx => tx.frozenUsdtAmount && tx.frozenUsdtAmount > 0)
  console.log(`\nTransactions with freezing: ${withFreezing.length} out of ${transactions.length}`)
}

checkTransactionsData().catch(console.error).finally(() => process.exit(0))