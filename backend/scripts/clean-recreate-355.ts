import { db } from '../src/db'
import { Status, TransactionType } from '@prisma/client'

async function cleanAndRecreate355() {
  console.log('=== CLEAN SYSTEM AND RECREATE TRANSACTION #355 ===\n')

  // 1. Удаляем все транзакции
  const deletedCount = await db.transaction.deleteMany({})
  console.log(`Deleted ${deletedCount.count} transactions`)

  // 2. Сбрасываем баланс и статистику всех трейдеров
  const traders = await db.user.findMany({})

  for (const trader of traders) {
    await db.user.update({
      where: { id: trader.id },
      data: {
        trustBalance: 1000,      // Устанавливаем баланс 1000 USDT
        frozenUsdt: 0,          // Обнуляем замороженные средства
        profitFromDeals: 0      // Обнуляем прибыль
      }
    })
    console.log(`Reset trader ${trader.email}: balance=1000, frozen=0, profit=0`)
  }

  // 3. Находим нужные данные для создания транзакции
  const trader = await db.user.findFirst({
    where: { email: 'trader@example.com' }
  })

  const merchant = await db.merchant.findFirst({
    where: { name: 'Test Merchant' }
  })

  const method = await db.method.findFirst({
    where: { type: 'c2c' }
  })

  if (!trader || !merchant || !method) {
    console.error('Required data not found!')
    return
  }

  // 4. Получаем настройки ККК
  const systemConfig = await db.systemConfig.findFirst()
  const kkkPercent = systemConfig?.kkkPercent || 0.5

  // 5. Создаем транзакцию #355
  const amount = 16245
  const rate = 90.73
  const adjustedRate = Math.floor(rate * (1 - kkkPercent / 100) * 100) / 100
  const frozenUsdtAmount = Math.ceil((amount / adjustedRate) * 100) / 100
  const feeInPercent = 8
  const calculatedCommission = Math.ceil((frozenUsdtAmount * feeInPercent / 100) * 100) / 100

  const tx = await db.transaction.create({
    data: {
      numericId: 355,
      merchantId: merchant.id,
      amount: amount,
      assetOrBank: 'Sberbank',
      orderId: `order_${Date.now()}`,
      methodId: method.id,
      currency: 'RUB',
      userId: 'user_1751826914487',
      userIp: '127.0.0.1',
      callbackUri: 'https://example.com/callback',
      successUri: 'https://example.com/success',
      failUri: 'https://example.com/fail',
      type: TransactionType.IN,
      expired_at: new Date(Date.now() + 30 * 60 * 1000),
      commission: 0,
      clientName: 'user_1751826914487',
      status: Status.IN_PROGRESS,
      traderId: trader.id,
      rate: rate,
      kkkPercent: kkkPercent,
      adjustedRate: adjustedRate,
      frozenUsdtAmount: frozenUsdtAmount,
      calculatedCommission: calculatedCommission,
      feeInPercent: feeInPercent,
      acceptedAt: new Date()
    }
  })

  console.log('\nCreated transaction #355:')
  console.log(`  Amount: ${tx.amount} RUB`)
  console.log(`  Merchant rate: ${tx.rate}`)
  console.log(`  KKK percent: ${tx.kkkPercent}%`)
  console.log(`  Adjusted rate: ${tx.adjustedRate}`)
  console.log(`  Frozen USDT: ${tx.frozenUsdtAmount}`)
  console.log(`  Commission: ${tx.calculatedCommission}`)
  console.log(`  Total to freeze: ${(tx.frozenUsdtAmount || 0) + (tx.calculatedCommission || 0)}`)
  
  // 6. Замораживаем средства у трейдера
  const totalToFreeze = (tx.frozenUsdtAmount || 0) + (tx.calculatedCommission || 0)
  await db.user.update({
    where: { id: trader.id },
    data: {
      frozenUsdt: { increment: totalToFreeze }
    }
  })

  // 7. Проверяем итоговое состояние
  const finalTrader = await db.user.findUnique({
    where: { id: trader.id }
  })

  console.log('\nFinal trader state:')
  console.log(`  Email: ${finalTrader?.email}`)
  console.log(`  Trust balance: ${finalTrader?.trustBalance}`)
  console.log(`  Frozen: ${finalTrader?.frozenUsdt}`)
  console.log(`  Available: ${(finalTrader?.trustBalance || 0) - (finalTrader?.frozenUsdt || 0)}`)
  console.log(`  Profit: ${finalTrader?.profitFromDeals}`)

  console.log('\n=== DONE ===')
  console.log('Transaction #355 created with:')
  console.log('- 179.97 USDT to be deducted')
  console.log('- 14.4 USDT commission')
  console.log('- Total frozen: 194.37 USDT')
}

cleanAndRecreate355().catch(console.error).finally(() => process.exit(0))