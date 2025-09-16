import { db } from '../src/db'

async function debugFrontendValue() {
  console.log('=== DEBUGGING FRONTEND VALUE FOR TRANSACTION #355 ===\n')

  // Получаем транзакцию так же, как в API
  const tx = await db.transaction.findFirst({
    where: { numericId: 355 },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
      method: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      receipts: {
        select: {
          id: true,
          fileName: true,
          isChecked: true,
          isFake: true,
        },
      },
      requisites: {
        select: {
          id: true,
          recipientName: true,
          cardNumber: true,
          bankType: true,
        },
      },
    },
  })

  if (!tx) {
    console.log('Transaction not found')
    return
  }

  console.log('Raw database values:')
  console.log(`  amount: ${tx.amount}`)
  console.log(`  rate: ${tx.rate}`)
  console.log(`  adjustedRate: ${tx.adjustedRate}`)
  console.log(`  frozenUsdtAmount: ${tx.frozenUsdtAmount}`)
  console.log(`  calculatedCommission: ${tx.calculatedCommission}`)

  // Симулируем трансформацию в API (из trader/transactions.ts)
  const traderRate = tx.adjustedRate || 
    (tx.rate !== null && tx.kkkPercent !== null 
      ? Math.floor(tx.rate * (1 - tx.kkkPercent / 100) * 100) / 100 
      : tx.rate);
  
  const profit = traderRate !== null ? tx.amount / traderRate : null;

  console.log('\nAPI transformation:')
  console.log(`  traderRate: ${traderRate}`)
  console.log(`  profit: ${profit}`)
  
  // Проверяем, что может показываться вместо frozenUsdtAmount
  console.log('\nPossible display values:')
  console.log(`  frozenUsdtAmount: ${tx.frozenUsdtAmount}`)
  console.log(`  profit: ${profit}`)
  console.log(`  profit.toFixed(2): ${profit?.toFixed(2)}`)
  console.log(`  amount / traderRate: ${tx.amount} / ${traderRate} = ${profit}`)
  
  // Проверяем расчет без frozenUsdtAmount (как в fallback)
  if (traderRate) {
    const calculatedUsdt = tx.amount / traderRate
    console.log(`\nFallback calculation (if frozenUsdtAmount is null):`)
    console.log(`  amount / rate: ${tx.amount} / ${traderRate} = ${calculatedUsdt}`)
    console.log(`  toFixed(2): ${calculatedUsdt.toFixed(2)}`)
  }
}

debugFrontendValue().catch(console.error).finally(() => process.exit(0))