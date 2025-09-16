import { db } from '../src/db'

async function fixTrustBalance() {
  // Найдем трейдера
  const trader = await db.user.findUnique({
    where: { email: 'trader@test.com' }
  })

  if (!trader) {
    console.log('Trader not found')
    return
  }

  console.log('Current trustBalance:', trader.trustBalance)
  console.log('Current frozenUsdt:', trader.frozenUsdt)

  // Установим trustBalance = 12000 (как было balanceUsdt)
  const updated = await db.user.update({
    where: { id: trader.id },
    data: { 
      trustBalance: 12000,
      balanceUsdt: 0,  // Обнуляем, так как не используем
      balanceRub: 0    // Обнуляем, так как не используем
    }
  })

  console.log('Updated trustBalance:', updated.trustBalance)
  console.log('Updated frozenUsdt:', updated.frozenUsdt)
  console.log('Available balance:', updated.trustBalance - updated.frozenUsdt)
}

fixTrustBalance().catch(console.error).finally(() => process.exit(0))