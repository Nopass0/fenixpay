import { db } from '../src/db'

async function clearTraderFrozenAndSetBalance() {
  console.log('=== Clearing frozen amount and setting balance for trader@example.com ===\n')

  // 1. Find the trader
  const trader = await db.user.findUnique({
    where: { email: 'trader@example.com' }
  })

  if (!trader) {
    console.log('❌ Trader not found!')
    return
  }

  console.log('Current trader state:')
  console.log(`  Email: ${trader.email}`)
  console.log(`  Balance USDT: ${trader.balanceUsdt}`)
  console.log(`  Frozen USDT: ${trader.frozenUsdt}`)
  console.log(`  Trust Balance: ${trader.trustBalance}`)

  // 2. Update the trader's frozen amount to 0 and balance to 10,000
  const updated = await db.user.update({
    where: { id: trader.id },
    data: {
      frozenUsdt: 0,
      balanceUsdt: 10000
    }
  })

  console.log('\n✅ Updated trader:')
  console.log(`  Email: ${updated.email}`)
  console.log(`  Balance USDT: ${updated.balanceUsdt}`)
  console.log(`  Frozen USDT: ${updated.frozenUsdt}`)
  console.log(`  Trust Balance: ${updated.trustBalance}`)
  console.log(`  Available in Trust Balance: ${(updated.trustBalance - updated.frozenUsdt).toFixed(2)}`)
}

clearTraderFrozenAndSetBalance().catch(console.error).finally(() => process.exit(0))