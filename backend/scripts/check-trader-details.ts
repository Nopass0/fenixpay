import { db } from '../src/db'

async function checkTraderDetails() {
  const trader = await db.user.findUnique({
    where: { email: 'trader@example.com' }
  })

  if (!trader) {
    console.log('❌ Trader not found!')
    return
  }

  console.log('=== Trader Details for trader@example.com ===')
  console.log(`ID: ${trader.id}`)
  console.log(`Name: ${trader.name}`)
  console.log(`Email: ${trader.email}`)
  console.log(`Balance USDT: ${trader.balanceUsdt}`)
  console.log(`Balance RUB: ${trader.balanceRub}`)
  console.log(`Frozen USDT: ${trader.frozenUsdt}`)
  console.log(`Frozen RUB: ${trader.frozenRub}`)
  console.log(`Trust Balance: ${trader.trustBalance}`)
  console.log(`Available Trust Balance: ${(trader.trustBalance - trader.frozenUsdt).toFixed(2)}`)
  console.log(`Traffic Enabled: ${trader.trafficEnabled}`)
  console.log(`Created: ${trader.createdAt}`)
}

checkTraderDetails().catch(console.error).finally(() => process.exit(0))