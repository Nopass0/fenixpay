import { db } from '../src/db'
import { Status } from '@prisma/client'

async function recreateTransaction355() {
  console.log('=== RECREATING TRANSACTION #355 ===\n')

  // 1. Найдем транзакцию #355 для копирования данных
  const originalTx = await db.transaction.findFirst({
    where: { numericId: 355 },
    include: {
      trader: true
    }
  })

  if (!originalTx) {
    console.log('Transaction #355 not found!')
    return
  }

  console.log('Found original transaction:')
  console.log(`  Trader: ${originalTx.trader?.email}`)
  console.log(`  Amount: ${originalTx.amount}`)
  console.log(`  Rate: ${originalTx.rate}`)
  console.log(`  Frozen USDT: ${originalTx.frozenUsdtAmount}`)
  console.log(`  Commission: ${originalTx.calculatedCommission}`)

  // 2. Обнулим прибыль трейдера
  if (originalTx.trader) {
    const updatedTrader = await db.user.update({
      where: { id: originalTx.trader.id },
      data: { profitFromDeals: 0 }
    })
    console.log(`\nReset profit for trader ${updatedTrader.email}:`)
    console.log(`  Profit: ${updatedTrader.profitFromDeals}`)
  }

  // 3. Удалим старую транзакцию
  await db.transaction.delete({
    where: { id: originalTx.id }
  })
  console.log('\nDeleted original transaction #355')

  // 4. Создадим новую транзакцию с теми же параметрами
  const newTx = await db.transaction.create({
    data: {
      numericId: 355,
      merchantId: originalTx.merchantId,
      amount: originalTx.amount,
      assetOrBank: originalTx.assetOrBank,
      orderId: originalTx.orderId,
      methodId: originalTx.methodId,
      currency: originalTx.currency,
      userId: originalTx.userId,
      userIp: originalTx.userIp,
      callbackUri: originalTx.callbackUri,
      successUri: originalTx.successUri,
      failUri: originalTx.failUri,
      type: originalTx.type,
      expired_at: new Date(Date.now() + 30 * 60 * 1000), // 30 минут от текущего времени
      commission: originalTx.commission,
      clientName: originalTx.clientName,
      status: Status.IN_PROGRESS,
      traderId: originalTx.traderId,
      rate: originalTx.rate,
      kkkPercent: originalTx.kkkPercent,
      adjustedRate: originalTx.adjustedRate,
      frozenUsdtAmount: originalTx.frozenUsdtAmount,
      calculatedCommission: originalTx.calculatedCommission,
      feeInPercent: originalTx.feeInPercent,
      acceptedAt: new Date()
    }
  })

  console.log('\nCreated new transaction #355:')
  console.log(`  ID: ${newTx.id}`)
  console.log(`  Numeric ID: ${newTx.numericId}`)
  console.log(`  Amount: ${newTx.amount}`)
  console.log(`  Rate: ${newTx.rate}`)
  console.log(`  Adjusted rate: ${newTx.adjustedRate}`)
  console.log(`  Frozen USDT: ${newTx.frozenUsdtAmount}`)
  console.log(`  Commission: ${newTx.calculatedCommission}`)
  console.log(`  Status: ${newTx.status}`)

  // 5. Проверим баланс трейдера
  if (originalTx.trader) {
    const trader = await db.user.findUnique({
      where: { id: originalTx.trader.id }
    })
    console.log(`\nTrader balance:`)
    console.log(`  Trust balance: ${trader?.trustBalance}`)
    console.log(`  Frozen: ${trader?.frozenUsdt}`)
    console.log(`  Profit: ${trader?.profitFromDeals}`)
  }

  console.log('\n=== TRANSACTION RECREATED SUCCESSFULLY ===')
  console.log('Now you can accept this transaction to test the profit calculation.')
  console.log('Expected profit after acceptance: 14.4 USDT')
}

recreateTransaction355().catch(console.error).finally(() => process.exit(0))