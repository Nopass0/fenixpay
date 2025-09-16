import { db } from '../src/db'

async function verifyDisplayValue() {
  const tx = await db.transaction.findFirst({
    where: { numericId: 355 }
  })

  if (!tx) {
    console.log('Transaction not found')
    return
  }

  console.log('Transaction #355 values:')
  console.log(`  frozenUsdtAmount: ${tx.frozenUsdtAmount}`)
  console.log(`  frozenUsdtAmount.toFixed(2): ${tx.frozenUsdtAmount?.toFixed(2)}`)
  console.log(`  Expected display: 179.97 USDT`)
  
  if (tx.frozenUsdtAmount) {
    console.log('\nChecking for precision issues:')
    console.log(`  Exact value * 100: ${tx.frozenUsdtAmount * 100}`)
    console.log(`  Is exactly 17997: ${tx.frozenUsdtAmount * 100 === 17997}`)
    
    // Check if there's a precision issue
    const rounded = Math.round(tx.frozenUsdtAmount * 100) / 100
    console.log(`  Math.round(value * 100) / 100: ${rounded}`)
    console.log(`  Rounded equals 179.97: ${rounded === 179.97}`)
  }
}

verifyDisplayValue().catch(console.error).finally(() => process.exit(0))