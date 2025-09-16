import { db } from "../db"

async function main() {
  // Check the 5 recent IN_PROGRESS transactions
  const transactions = await db.transaction.findMany({
    where: {
      type: 'IN',
      status: 'IN_PROGRESS',
      traderId: 'cmcz5rz0t0001ikklieyrehm8' // Test Trader
    },
    include: {
      trader: true,
      requisites: {
        include: {
          user: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  })

  console.log(`Found ${transactions.length} IN_PROGRESS transactions for Test Trader`)
  
  // Calculate total frozen amounts from transactions
  let totalFrozenFromTx = 0
  let totalCommission = 0
  
  transactions.forEach(tx => {
    console.log(`
Transaction: ${tx.id}
Amount: ${tx.amount} RUB
Rate: ${tx.rate}
Frozen USDT: ${tx.frozenUsdtAmount || 0}
Commission: ${tx.calculatedCommission || 0}
Has Requisites: ${tx.requisites ? 'YES' : 'NO'}
Requisites User ID: ${tx.requisites?.userId || 'NULL'}
`)
    totalFrozenFromTx += tx.frozenUsdtAmount || 0
    totalCommission += tx.calculatedCommission || 0
  })

  console.log(`\nTotal frozen from transactions: ${totalFrozenFromTx} USDT`)
  console.log(`Total commission: ${totalCommission} USDT`)
  console.log(`Total that should be frozen: ${totalFrozenFromTx + totalCommission} USDT`)

  // Check actual trader frozen balance
  const trader = await db.user.findUnique({
    where: { id: 'cmcz5rz0t0001ikklieyrehm8' }
  })

  console.log(`\nTrader actual frozen USDT: ${trader?.frozenUsdt || 0}`)
  console.log(`Trader trust balance: ${trader?.trustBalance || 0}`)
  
  if (trader && trader.frozenUsdt === 0 && totalFrozenFromTx > 0) {
    console.log("\n❌ ПРОБЛЕМА: Транзакции имеют frozenUsdtAmount, но баланс трейдера не обновлен!")
    console.log("Возможная причина: условие 'if (freezingParams && chosen.user)' не выполняется")
  }

  await db.$disconnect()
}

main().catch(console.error)