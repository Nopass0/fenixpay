import { db } from "../db"

async function main() {
  // Calculate what should be frozen based on IN_PROGRESS transactions
  const transactions = await db.transaction.findMany({
    where: {
      traderId: 'cmcz5rz0t0001ikklieyrehm8',
      type: 'IN',
      status: 'IN_PROGRESS'
    }
  })

  let totalShouldBeFrozen = 0
  
  console.log('IN_PROGRESS transactions:')
  transactions.forEach(tx => {
    const frozen = (tx.frozenUsdtAmount || 0) + (tx.calculatedCommission || 0)
    totalShouldBeFrozen += frozen
    console.log(`- ${tx.id}: ${tx.frozenUsdtAmount || 0} + ${tx.calculatedCommission || 0} = ${frozen} USDT`)
  })

  console.log(`\nTotal that should be frozen: ${totalShouldBeFrozen} USDT`)

  // Get current trader balance
  const trader = await db.user.findUnique({
    where: { id: 'cmcz5rz0t0001ikklieyrehm8' }
  })

  console.log(`Current frozen balance: ${trader?.frozenUsdt || 0} USDT`)

  if (trader && trader.frozenUsdt !== totalShouldBeFrozen) {
    console.log('\nFixing frozen balance...')
    
    const updated = await db.user.update({
      where: { id: trader.id },
      data: {
        frozenUsdt: totalShouldBeFrozen
      }
    })

    console.log(`Updated frozen balance to: ${updated.frozenUsdt} USDT`)
  } else {
    console.log('\nFrozen balance is already correct')
  }

  await db.$disconnect()
}

main().catch(console.error)