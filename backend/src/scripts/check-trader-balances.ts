import { db } from "../db"

async function main() {
  const traders = await db.user.findMany({
    where: {
      balanceUsdt: {
        gt: 0
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      balanceUsdt: true,
      trustBalance: true,
      frozenUsdt: true,
      frozenRub: true
    },
    orderBy: {
      balanceUsdt: 'desc'
    },
    take: 10
  })

  console.log("Трейдеры с положительным балансом USDT:")
  console.log("=".repeat(100))
  
  traders.forEach(trader => {
    console.log(`
ID: ${trader.id}
Имя: ${trader.name}
Email: ${trader.email}
USDT баланс: ${trader.balanceUsdt}
Trust баланс: ${trader.trustBalance}
Заморожено USDT: ${trader.frozenUsdt}
Заморожено RUB: ${trader.frozenRub}
${"─".repeat(100)}`)
  })

  if (traders.length === 0) {
    console.log("Нет трейдеров с положительным балансом USDT")
  }

  // Check specific trader with 500000 balance
  const richTrader = await db.user.findFirst({
    where: {
      balanceUsdt: 500000
    },
    select: {
      id: true,
      name: true,
      email: true,
      balanceUsdt: true,
      trustBalance: true,
      frozenUsdt: true,
      frozenRub: true
    }
  })

  if (richTrader) {
    console.log("\nТрейдер с балансом 500000:")
    console.log(`
ID: ${richTrader.id}
Имя: ${richTrader.name}
Email: ${richTrader.email}
USDT баланс: ${richTrader.balanceUsdt}
Trust баланс: ${richTrader.trustBalance} <-- ПРОБЛЕМА: Trust balance = 0!
Заморожено USDT: ${richTrader.frozenUsdt}
Заморожено RUB: ${richTrader.frozenRub}
`)
  }

  await db.$disconnect()
}

main().catch(console.error)