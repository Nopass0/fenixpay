import { db } from '../src/db'

async function checkApiResponse() {
  console.log('=== CHECKING API RESPONSE FOR TRANSACTION #355 ===\n')

  // Get transaction as it would be in the API
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

  console.log('Database values:')
  console.log(`  frozenUsdtAmount: ${tx.frozenUsdtAmount}`)
  console.log(`  frozenUsdtAmount type: ${typeof tx.frozenUsdtAmount}`)
  
  // Simulate what happens in the API response transformation
  const traderRate = tx.adjustedRate || 
    (tx.rate !== null && tx.kkkPercent !== null 
      ? Math.floor(tx.rate * (1 - tx.kkkPercent / 100) * 100) / 100 
      : tx.rate);
  
  const profit = traderRate !== null ? tx.amount / traderRate : null;
  
  const apiResponse = {
    ...tx,
    rate: traderRate,
    profit,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    expired_at: tx.expired_at.toISOString(),
    acceptedAt: tx.acceptedAt ? tx.acceptedAt.toISOString() : null,
  }

  console.log('\nAPI Response simulation:')
  console.log(`  frozenUsdtAmount: ${apiResponse.frozenUsdtAmount}`)
  console.log(`  rate (adjusted): ${apiResponse.rate}`)
  console.log(`  profit: ${apiResponse.profit}`)

  // Test JSON serialization
  const jsonString = JSON.stringify(apiResponse)
  const parsed = JSON.parse(jsonString)
  
  console.log('\nAfter JSON serialization/deserialization:')
  console.log(`  frozenUsdtAmount: ${parsed.frozenUsdtAmount}`)
  console.log(`  type: ${typeof parsed.frozenUsdtAmount}`)
  
  if (parsed.frozenUsdtAmount) {
    console.log(`  toFixed(2): ${parsed.frozenUsdtAmount.toFixed(2)}`)
    console.log(`  Math.round(x * 100) / 100: ${Math.round(parsed.frozenUsdtAmount * 100) / 100}`)
  }
}

checkApiResponse().catch(console.error).finally(() => process.exit(0))