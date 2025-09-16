import { db } from "../db"

async function main() {
  // Get test merchant
  const testMerchant = await db.merchant.findFirst({
    where: { name: 'test' }
  })
  
  if (!testMerchant) {
    console.error('Test merchant not found')
    return
  }

  // Get a method
  const method = await db.method.findFirst({
    where: { isEnabled: true }
  })

  if (!method) {
    console.error('No enabled methods found')
    return
  }

  console.log('Creating test transaction...')
  console.log('Merchant token:', testMerchant.token)
  console.log('Method ID:', method.id)

  const baseUrl = process.env.API_URL || 'http://localhost:3000/api'
  const response = await fetch(`${baseUrl}/merchant/transactions/in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-merchant-api-key': testMerchant.token
    },
    body: JSON.stringify({
      amount: 1000,
      orderId: `TEST_DEBUG_${Date.now()}`,
      methodId: method.id,
      rate: 100,
      expired_at: new Date(Date.now() + 3600000).toISOString(),
      userIp: '127.0.0.1',
      callbackUri: ''
    })
  })

  const result = await response.json()
  
  if (response.ok) {
    console.log('Transaction created successfully:', result)
    
    // Check trader frozen balance
    if (result.traderId) {
      const trader = await db.user.findUnique({
        where: { id: result.traderId }
      })
      console.log(`\nTrader ${result.traderId} frozen balance: ${trader?.frozenUsdt}`)
    }
  } else {
    console.error('Failed to create transaction:', result)
  }

  await db.$disconnect()
}

main().catch(console.error)