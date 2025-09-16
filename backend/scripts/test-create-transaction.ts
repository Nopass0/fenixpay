import { db } from '../src/db'

async function testCreateTransaction() {
  console.log('=== TESTING TRANSACTION CREATION ===\n')

  // Получаем мерчанта test
  const merchant = await db.merchant.findFirst({
    where: { name: 'test' }
  })

  if (!merchant) {
    console.log('Merchant "test" not found!')
    return
  }

  console.log(`Using merchant: ${merchant.name}`)
  console.log(`API Token: ${merchant.token}`)

  // Получаем метод Сбербанк C2C
  const method = await db.method.findFirst({
    where: { code: 'sber_c2c' }
  })

  if (!method) {
    console.log('Method "sber_c2c" not found!')
    return
  }

  console.log(`Using method: ${method.name} (${method.id})`)

  // Формируем запрос
  const payload = {
    amount: 5000,
    orderId: `test_order_${Date.now()}`,
    methodId: method.id,
    rate: 95,
    expired_at: new Date(Date.now() + 86400000).toISOString()
  }

  console.log('\nSending request:')
  console.log(JSON.stringify(payload, null, 2))

  try {
    const response = await fetch('http://localhost:3000/merchant/transactions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-merchant-api-key': merchant.token
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    
    console.log(`\nResponse status: ${response.status}`)
    console.log('Response data:')
    console.log(JSON.stringify(result, null, 2))

    if (response.ok) {
      console.log('\n✅ Transaction created successfully!')
      
      // Проверяем назначение трейдера
      const tx = await db.transaction.findUnique({
        where: { id: result.id },
        include: {
          trader: true,
          bankDetail: true
        }
      })

      if (tx?.trader) {
        console.log(`\nAssigned to trader: ${tx.trader.email}`)
        console.log(`Frozen amount: ${tx.frozenUsdtAmount} USDT`)
        console.log(`Trader balance: ${tx.trader.trustBalance} USDT`)
        console.log(`Trader frozen: ${tx.trader.frozenUsdt} USDT`)
      } else {
        console.log('\n❌ Transaction was not assigned to any trader!')
      }
    } else {
      console.log('\n❌ Failed to create transaction')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

testCreateTransaction().catch(console.error).finally(() => process.exit(0))