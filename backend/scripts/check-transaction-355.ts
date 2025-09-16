import { db } from '../src/db'
import { calculateFreezingParams, floorDown2, ceilUp2 } from '../src/utils/freezing'

async function checkTransaction355() {
  console.log('=== CHECKING TRANSACTION #355 ===\n')

  // Найдем транзакцию
  const tx = await db.transaction.findFirst({
    where: { numericId: 355 },
    include: {
      trader: true,
      method: true,
      merchant: true
    }
  })

  if (!tx) {
    console.log('Transaction #355 not found!')
    return
  }

  console.log('Transaction details:')
  console.log(`  ID: ${tx.id}`)
  console.log(`  Amount: ${tx.amount} RUB`)
  console.log(`  Merchant rate: ${tx.rate}`)
  console.log(`  KKK percent: ${tx.kkkPercent}%`)
  console.log(`  Adjusted rate: ${tx.adjustedRate}`)
  console.log(`  Frozen USDT: ${tx.frozenUsdtAmount}`)
  console.log(`  Commission: ${tx.calculatedCommission}`)
  console.log(`  Fee in percent: ${tx.feeInPercent}%`)
  console.log(`  Status: ${tx.status}`)
  console.log(`  Trader: ${tx.trader?.email}`)

  // Проверим расчеты
  console.log('\n=== CHECKING CALCULATIONS ===')
  
  if (tx.rate && tx.kkkPercent !== null) {
    // 1. Проверяем скорректированный курс
    const expectedAdjustedRate = floorDown2(tx.rate * (1 - tx.kkkPercent / 100))
    console.log(`\n1. Adjusted rate:`)
    console.log(`   Formula: ${tx.rate} * (1 - ${tx.kkkPercent}/100)`)
    console.log(`   Raw: ${tx.rate * (1 - tx.kkkPercent / 100)}`)
    console.log(`   Expected (floor): ${expectedAdjustedRate}`)
    console.log(`   Actual: ${tx.adjustedRate}`)
    console.log(`   Match: ${expectedAdjustedRate === tx.adjustedRate ? '✓' : '✗'}`)

    // 2. Проверяем замороженную сумму USDT
    const expectedFrozenUsdt = ceilUp2(tx.amount / expectedAdjustedRate)
    console.log(`\n2. Frozen USDT:`)
    console.log(`   Formula: ceilUp2(${tx.amount} / ${expectedAdjustedRate})`)
    console.log(`   Raw: ${tx.amount / expectedAdjustedRate}`)
    console.log(`   Expected (ceil): ${expectedFrozenUsdt}`)
    console.log(`   Actual: ${tx.frozenUsdtAmount}`)
    console.log(`   Match: ${expectedFrozenUsdt === tx.frozenUsdtAmount ? '✓' : '✗'}`)

    // 3. Проверяем комиссию
    if (tx.feeInPercent !== null && tx.frozenUsdtAmount) {
      const expectedCommission = ceilUp2(tx.frozenUsdtAmount * tx.feeInPercent / 100)
      console.log(`\n3. Commission:`)
      console.log(`   Formula: ceilUp2(${tx.frozenUsdtAmount} * ${tx.feeInPercent} / 100)`)
      console.log(`   Raw: ${tx.frozenUsdtAmount * tx.feeInPercent / 100}`)
      console.log(`   Expected (ceil): ${expectedCommission}`)
      console.log(`   Actual: ${tx.calculatedCommission}`)
      console.log(`   Match: ${expectedCommission === tx.calculatedCommission ? '✓' : '✗'}`)

      // 4. Проверяем общую замороженную сумму
      const totalFrozen = (tx.frozenUsdtAmount || 0) + (tx.calculatedCommission || 0)
      console.log(`\n4. Total frozen:`)
      console.log(`   Frozen USDT: ${tx.frozenUsdtAmount}`)
      console.log(`   Commission: ${tx.calculatedCommission}`)
      console.log(`   Total: ${totalFrozen}`)

      // 5. Проверяем потенциальную прибыль
      const actualSpent = tx.amount / tx.rate
      const profit = totalFrozen - actualSpent
      console.log(`\n5. Potential profit:`)
      console.log(`   Total frozen: ${totalFrozen}`)
      console.log(`   Actual spent (at merchant rate): ${actualSpent.toFixed(2)}`)
      console.log(`   Profit: ${profit.toFixed(2)}`)
    }
  }

  // Проверим баланс трейдера
  if (tx.trader) {
    console.log(`\n=== TRADER BALANCE ===`)
    console.log(`  Email: ${tx.trader.email}`)
    console.log(`  Trust balance: ${tx.trader.trustBalance}`)
    console.log(`  Frozen: ${tx.trader.frozenUsdt}`)
    console.log(`  Available: ${(tx.trader.trustBalance - tx.trader.frozenUsdt).toFixed(2)}`)
  }

  // Проверим TraderMerchant настройки
  if (tx.trader && tx.merchant && tx.method) {
    const tm = await db.traderMerchant.findUnique({
      where: {
        traderId_merchantId_methodId: {
          traderId: tx.trader.id,
          merchantId: tx.merchant.id,
          methodId: tx.method.id
        }
      }
    })
    
    if (tm) {
      console.log(`\n=== TRADER-MERCHANT SETTINGS ===`)
      console.log(`  Fee in: ${tm.feeIn}%`)
      console.log(`  Fee in enabled: ${tm.isFeeInEnabled}`)
    }
  }
}

checkTransaction355().catch(console.error).finally(() => process.exit(0))