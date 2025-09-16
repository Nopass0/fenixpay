import { db } from '../src/db'

async function fixMerchantTraderLinks() {
  console.log('=== FIXING MERCHANT-TRADER LINKS ===\n')

  // 1. Найдем мерчанта test
  const testMerchant = await db.merchant.findFirst({
    where: { name: 'test' }
  })

  if (!testMerchant) {
    console.log('Merchant "test" not found!')
    return
  }

  console.log(`Found merchant: ${testMerchant.name} (ID: ${testMerchant.id})`)

  // 2. Найдем трейдеров
  const traders = await db.user.findMany({
    where: {
      email: { in: ['trader@test.com', 'trader@example.com'] }
    }
  })

  console.log(`\nFound ${traders.length} traders`)

  // 3. Найдем методы
  const methods = await db.method.findMany({
    where: {
      isEnabled: true,
      type: { in: ['c2c', 'sbp'] }
    }
  })

  console.log(`Found ${methods.length} active methods`)

  // 4. Создаем связи
  console.log('\nCreating TraderMerchant relationships...')
  
  for (const trader of traders) {
    for (const method of methods) {
      // Проверяем, есть ли уже связь
      const existing = await db.traderMerchant.findFirst({
        where: {
          traderId: trader.id,
          merchantId: testMerchant.id,
          methodId: method.id
        }
      })

      if (!existing) {
        await db.traderMerchant.create({
          data: {
            traderId: trader.id,
            merchantId: testMerchant.id,
            methodId: method.id
          }
        })
        console.log(`✓ Created link: ${trader.email} - ${testMerchant.name} - ${method.name}`)
      } else {
        console.log(`- Link already exists: ${trader.email} - ${testMerchant.name} - ${method.name}`)
      }
    }
  }

  // 5. Назначаем существующие транзакции
  console.log('\n=== ASSIGNING UNASSIGNED TRANSACTIONS ===')
  
  const unassignedTx = await db.transaction.findMany({
    where: {
      traderId: null,
      merchantId: testMerchant.id,
      type: 'IN',
      status: { in: ['CREATED', 'IN_PROGRESS'] }
    }
  })

  console.log(`\nFound ${unassignedTx.length} unassigned transactions`)

  let assigned = 0
  for (const tx of unassignedTx) {
    // Найдем подходящего трейдера
    const availableTraders = await db.traderMerchant.findMany({
      where: {
        merchantId: tx.merchantId,
        methodId: tx.methodId
      },
      include: {
        trader: true
      }
    })

    if (availableTraders.length > 0) {
      // Выбираем трейдера с наименьшей заморозкой
      const trader = availableTraders.reduce((best, current) => {
        return current.trader.frozenUsdt < best.trader.frozenUsdt ? current : best
      }).trader

      await db.transaction.update({
        where: { id: tx.id },
        data: { traderId: trader.id }
      })
      
      assigned++
      console.log(`✓ Assigned transaction #${tx.numericId} to ${trader.email}`)
    }
  }

  console.log(`\n✅ Assigned ${assigned} transactions`)

  // 6. Финальная проверка
  console.log('\n=== FINAL CHECK ===')
  const stillUnassigned = await db.transaction.count({
    where: {
      traderId: null,
      type: 'IN',
      status: { in: ['CREATED', 'IN_PROGRESS'] }
    }
  })
  
  console.log(`Unassigned transactions remaining: ${stillUnassigned}`)
}

fixMerchantTraderLinks().catch(console.error).finally(() => process.exit(0))