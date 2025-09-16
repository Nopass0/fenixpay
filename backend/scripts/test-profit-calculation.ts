import { db } from '../src/db'

async function testProfitCalculation() {
  console.log('=== TESTING PROFIT CALCULATION FOR TRANSACTION #355 ===\n')

  const tx = await db.transaction.findFirst({
    where: { numericId: 355 }
  })

  if (!tx || !tx.rate || !tx.frozenUsdtAmount || !tx.calculatedCommission) {
    console.log('Transaction not found or missing data')
    return
  }

  console.log('Transaction data:')
  console.log(`  Amount: ${tx.amount} RUB`)
  console.log(`  Merchant rate: ${tx.rate}`)
  console.log(`  Frozen USDT: ${tx.frozenUsdtAmount}`)
  console.log(`  Commission: ${tx.calculatedCommission}`)

  console.log('\nProfit calculation:')
  
  // Вариант 1: Общая замороженная сумма минус фактические расходы
  const totalFrozen = tx.frozenUsdtAmount + tx.calculatedCommission
  const actualSpent = tx.amount / tx.rate
  const profit1 = totalFrozen - actualSpent
  
  console.log('\nOption 1 (Total frozen - actual spent):')
  console.log(`  Total frozen: ${tx.frozenUsdtAmount} + ${tx.calculatedCommission} = ${totalFrozen}`)
  console.log(`  Actual spent: ${tx.amount} / ${tx.rate} = ${actualSpent.toFixed(2)}`)
  console.log(`  Profit: ${totalFrozen} - ${actualSpent.toFixed(2)} = ${profit1.toFixed(2)}`)
  
  // Вариант 2: Только комиссия как прибыль
  const profit2 = tx.calculatedCommission
  console.log('\nOption 2 (Commission only):')
  console.log(`  Profit: ${profit2}`)
  
  // Вариант 3: Разница между замороженным USDT и фактически потраченным
  const profit3 = tx.frozenUsdtAmount - actualSpent
  console.log('\nOption 3 (Frozen USDT - actual spent):')
  console.log(`  Profit: ${tx.frozenUsdtAmount} - ${actualSpent.toFixed(2)} = ${profit3.toFixed(2)}`)

  console.log('\n=== USER EXPECTS: 14.4 USDT ===')
  console.log('This matches Option 2: Commission only')
}

testProfitCalculation().catch(console.error).finally(() => process.exit(0))