import { db } from "../db"

async function main() {
  const trader = await db.user.findUnique({
    where: { email: 'trader@test.com' }
  })
  
  if (!trader) {
    console.log('Trader not found')
    return
  }

  console.log('Initial frozen USDT:', trader.frozenUsdt)
  console.log('\nMonitoring frozen balance changes...')
  console.log('Press Ctrl+C to stop\n')
  
  let lastFrozen = trader.frozenUsdt
  
  setInterval(async () => {
    const current = await db.user.findUnique({
      where: { id: trader.id },
      select: { frozenUsdt: true }
    })
    
    if (current && current.frozenUsdt !== lastFrozen) {
      const diff = current.frozenUsdt - lastFrozen
      console.log(`[${new Date().toLocaleTimeString()}] Frozen USDT changed: ${lastFrozen} → ${current.frozenUsdt} (${diff > 0 ? '+' : ''}${diff})`)
      lastFrozen = current.frozenUsdt
    }
  }, 1000)
}

main().catch(console.error)