import { db } from '../src/db'

async function checkExactValues() {
  console.log('=== CHECKING EXACT VALUES FOR TRANSACTION #355 ===\n')

  // Найдем транзакцию
  const tx = await db.transaction.findFirst({
    where: { numericId: 355 },
    select: {
      id: true,
      numericId: true,
      amount: true,
      rate: true,
      kkkPercent: true,
      adjustedRate: true,
      frozenUsdtAmount: true,
      calculatedCommission: true,
      feeInPercent: true
    }
  })

  if (!tx) {
    console.log('Transaction #355 not found!')
    return
  }

  console.log('Raw values from database:')
  console.log(`  amount: ${tx.amount}`)
  console.log(`  rate: ${tx.rate}`)
  console.log(`  kkkPercent: ${tx.kkkPercent}`)
  console.log(`  adjustedRate: ${tx.adjustedRate}`)
  console.log(`  frozenUsdtAmount: ${tx.frozenUsdtAmount}`)
  console.log(`  calculatedCommission: ${tx.calculatedCommission}`)
  console.log(`  feeInPercent: ${tx.feeInPercent}`)

  if (tx.frozenUsdtAmount !== null) {
    console.log('\nJavaScript toFixed() behavior:')
    console.log(`  frozenUsdtAmount.toFixed(2): ${tx.frozenUsdtAmount.toFixed(2)}`)
    console.log(`  Math.floor(frozenUsdtAmount * 100) / 100: ${Math.floor(tx.frozenUsdtAmount * 100) / 100}`)
    console.log(`  Math.ceil(frozenUsdtAmount * 100) / 100: ${Math.ceil(tx.frozenUsdtAmount * 100) / 100}`)
    
    // Проверим точное значение
    console.log(`\nExact decimal representation:`)
    console.log(`  frozenUsdtAmount * 100 = ${tx.frozenUsdtAmount * 100}`)
    console.log(`  Is it exactly 17997? ${tx.frozenUsdtAmount * 100 === 17997}`)
    console.log(`  Difference from 17997: ${(tx.frozenUsdtAmount * 100) - 17997}`)
  }
}

checkExactValues().catch(console.error).finally(() => process.exit(0))