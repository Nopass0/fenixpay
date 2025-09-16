import { db } from '../src/db'
import { Status, TransactionType } from '@prisma/client'
import { calculateFreezingParams, ceilUp2, floorDown2 } from '../src/utils/freezing'

async function createTestTransaction() {
  console.log('=== CREATING TEST TRANSACTION ===\n')

  // Находим трейдера и мерчанта
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

  // Получаем настройки
  const systemConfig = await db.systemConfig.findFirst()
  const kkkPercent = systemConfig?.kkkPercent || 0.5

  const traderMerchant = await db.traderMerchant.findUnique({
    where: {
      traderId_merchantId_methodId: {
        traderId: trader.id,
        merchantId: merchant.id,
        methodId: method.id
      }
    }
  })

  const feeInPercent = traderMerchant?.feeIn || 8

  // Создаем новую транзакцию
  const amount = 10000 // 10,000 RUB
  const rate = 95.5
  const params = calculateFreezingParams(amount, rate, kkkPercent, feeInPercent)

  const numericId = Math.floor(Date.now() / 1000)

  const tx = await db.transaction.create({
    data: {
      numericId: numericId,
      merchantId: merchant.id,
      amount: amount,
      assetOrBank: 'Sberbank',
      orderId: `order_${Date.now()}`,
      methodId: method.id,
      currency: 'RUB',
      userId: `user_${Date.now()}`,
      userIp: '127.0.0.1',
      callbackUri: 'https://example.com/callback',
      successUri: 'https://example.com/success',
      failUri: 'https://example.com/fail',
      type: TransactionType.IN,
      expired_at: new Date(Date.now() + 30 * 60 * 1000),
      commission: 0,
      clientName: 'Test Client',
      status: Status.IN_PROGRESS,
      traderId: trader.id,
      rate: rate,
      kkkPercent: kkkPercent,
      adjustedRate: params.adjustedRate,
      frozenUsdtAmount: params.frozenUsdtAmount,
      calculatedCommission: params.calculatedCommission,
      feeInPercent: feeInPercent,
      acceptedAt: new Date()
    }
  })

  // Замораживаем средства
  const totalToFreeze = params.totalRequired || 0
  await db.user.update({
    where: { id: trader.id },
    data: {
      frozenUsdt: { increment: totalToFreeze }
    }
  })

  // Проверяем результат
  const updatedTrader = await db.user.findUnique({
    where: { id: trader.id }
  })

  console.log('Created transaction:')
  console.log(`  Numeric ID: ${tx.numericId}`)
  console.log(`  Amount: ${tx.amount} RUB`)
  console.log(`  Rate: ${tx.rate}`)
  console.log(`  Adjusted rate: ${tx.adjustedRate}`)
  console.log(`  Frozen USDT: ${tx.frozenUsdtAmount}`)
  console.log(`  Commission: ${tx.calculatedCommission}`)
  console.log(`  Total frozen: ${totalToFreeze}`)

  console.log('\nTrader state after creation:')
  console.log(`  Trust balance: ${updatedTrader?.trustBalance}`)
  console.log(`  Frozen: ${updatedTrader?.frozenUsdt}`)
  console.log(`  Available: ${(updatedTrader?.trustBalance || 0) - (updatedTrader?.frozenUsdt || 0)}`)
  console.log(`  Current profit: ${updatedTrader?.profitFromDeals}`)

  console.log('\n=== TRANSACTION CREATED ===')
  console.log(`Transaction #${tx.numericId} is ready to be accepted in the UI`)
  console.log(`Expected profit increase after acceptance: ${tx.calculatedCommission} USDT`)
}

createTestTransaction().catch(console.error).finally(() => process.exit(0))