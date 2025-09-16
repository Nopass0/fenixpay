import { db } from "../db"

async function main() {
  // Check recent transactions
  const recentTransactions = await db.transaction.findMany({
    where: {
      type: 'IN',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10,
    include: {
      trader: {
        select: {
          id: true,
          name: true,
          trustBalance: true,
          balanceUsdt: true,
          frozenUsdt: true
        }
      }
    }
  })

  console.log("Recent IN transactions (last 24 hours):")
  console.log("=".repeat(100))
  
  recentTransactions.forEach(tx => {
    console.log(`
Transaction ID: ${tx.id}
Amount: ${tx.amount} RUB
Rate: ${tx.rate || 'NULL'}
Status: ${tx.status}
Frozen USDT: ${tx.frozenUsdtAmount || 'NULL'}
Commission: ${tx.calculatedCommission || 'NULL'}
Created: ${tx.createdAt}
Trader: ${tx.trader?.name || 'No trader assigned'}
Trader Trust Balance: ${tx.trader?.trustBalance || 0}
Trader USDT Balance: ${tx.trader?.balanceUsdt || 0}
Trader Frozen USDT: ${tx.trader?.frozenUsdt || 0}
${"─".repeat(100)}`)
  })

  // Check IN_PROGRESS transactions specifically
  console.log("\n\nIN_PROGRESS transactions:")
  console.log("=".repeat(100))
  
  const inProgressTxs = await db.transaction.findMany({
    where: {
      type: 'IN',
      status: 'IN_PROGRESS'
    },
    include: {
      trader: {
        select: {
          id: true,
          name: true,
          trustBalance: true,
          frozenUsdt: true
        }
      }
    }
  })

  if (inProgressTxs.length === 0) {
    console.log("No IN_PROGRESS transactions found")
  } else {
    inProgressTxs.forEach(tx => {
      console.log(`
Transaction ID: ${tx.id}
Amount: ${tx.amount} RUB
Rate: ${tx.rate || 'NULL'} <-- Check if rate is NULL!
Frozen USDT: ${tx.frozenUsdtAmount || 'NULL'} <-- Check if freezing happened!
Commission: ${tx.calculatedCommission || 'NULL'}
Trader: ${tx.trader?.name || 'No trader'}
Trader Trust Balance: ${tx.trader?.trustBalance || 0}
Trader Frozen USDT: ${tx.trader?.frozenUsdt || 0}
`)
    })
  }

  await db.$disconnect()
}

main().catch(console.error)