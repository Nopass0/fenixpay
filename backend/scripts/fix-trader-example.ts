import { db } from '../src/db'

async function fixTraderExample() {
  console.log('=== Fixing trader@example.com ===\n')

  // 1. Найдем трейдера
  const trader = await db.user.findUnique({
    where: { email: 'trader@example.com' }
  })

  if (!trader) {
    console.log('❌ Trader trader@example.com not found!')
    return
  }

  console.log('1. Current state:')
  console.log('   Trust Balance:', trader.trustBalance)
  console.log('   Balance USDT:', trader.balanceUsdt)
  console.log('   Frozen USDT:', trader.frozenUsdt)
  console.log('   Traffic Enabled:', trader.trafficEnabled)

  // 2. Обновим trustBalance (перенесем из balanceUsdt)
  const currentBalance = trader.balanceUsdt || 2000
  const updated = await db.user.update({
    where: { id: trader.id },
    data: { 
      trustBalance: currentBalance,
      balanceUsdt: 0,  // Обнуляем
      balanceRub: 0,    // Обнуляем
      trafficEnabled: true  // Включаем трафик
    }
  })

  console.log('\n2. Updated state:')
  console.log('   Trust Balance:', updated.trustBalance)
  console.log('   Balance USDT:', updated.balanceUsdt)
  console.log('   Frozen USDT:', updated.frozenUsdt)

  // 3. Проверим транзакции
  const transactions = await db.transaction.count({
    where: { traderId: trader.id }
  })
  console.log('\n3. Transactions assigned to this trader:', transactions)

  if (transactions === 0) {
    console.log('\n❌ No transactions found for this trader!')
    
    // 4. Проверим TraderMerchant связи
    const traderMerchants = await db.traderMerchant.count({
      where: { traderId: trader.id }
    })
    
    console.log('4. TraderMerchant relationships:', traderMerchants)
    
    if (traderMerchants === 0) {
      console.log('   Creating TraderMerchant relationships...')
      
      // Найдем мерчанта и методы
      const merchant = await db.merchant.findFirst({
        where: { name: 'Test Merchant' }
      })
      
      if (merchant) {
        const methods = await db.method.findMany({
          where: {
            isEnabled: true,
            type: { in: ['c2c', 'sbp'] }
          }
        })
        
        // Создаем связи
        for (const method of methods) {
          await db.traderMerchant.create({
            data: {
              traderId: trader.id,
              merchantId: merchant.id,
              methodId: method.id
            }
          })
          console.log(`   ✓ Created relationship for ${method.name}`)
        }
      }
    }
    
    // 5. Переназначим некоторые транзакции этому трейдеру
    const unassignedTransactions = await db.transaction.findMany({
      where: {
        traderId: null,
        type: 'IN',
        status: { in: ['CREATED', 'IN_PROGRESS'] }
      },
      take: 10
    })
    
    if (unassignedTransactions.length > 0) {
      console.log(`\n5. Assigning ${unassignedTransactions.length} transactions to trader...`)
      
      await db.transaction.updateMany({
        where: {
          id: { in: unassignedTransactions.map(t => t.id) }
        },
        data: {
          traderId: trader.id
        }
      })
      
      console.log('   ✓ Transactions assigned')
    }
  }

  // 6. Проверим банковские реквизиты
  const bankDetails = await db.bankDetail.count({
    where: { 
      userId: trader.id,
      isArchived: false
    }
  })
  
  console.log('\n6. Active bank details:', bankDetails)
  
  if (bankDetails === 0) {
    console.log('   Creating bank details...')
    
    // Создаем реквизиты
    const banks = [
      { type: 'SBERBANK', card: '4276 3800 1234 5678' },
      { type: 'TBANK', card: '5536 9138 2345 6789' },
      { type: 'VTB', card: '4272 3200 3456 7890' }
    ]
    
    for (const bank of banks) {
      await db.bankDetail.create({
        data: {
          userId: trader.id,
          methodType: 'c2c',
          bankType: bank.type as any,
          cardNumber: bank.card,
          recipientName: 'ИВАН ПЕТРОВ',
          minAmount: 100,
          maxAmount: 50000,
          dailyLimit: 500000,
          monthlyLimit: 5000000,
          intervalMinutes: 0
        }
      })
      console.log(`   ✓ Created ${bank.type} requisites`)
    }
  }

  console.log('\n✅ Done! Trader trader@example.com is ready.')
}

fixTraderExample().catch(console.error).finally(() => process.exit(0))