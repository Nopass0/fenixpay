import { db } from '../src/db'
import { Status } from '@prisma/client'

async function acceptTransaction355() {
  console.log('=== ACCEPTING TRANSACTION #355 ===\n')

  // Найдем транзакцию
  const tx = await db.transaction.findFirst({
    where: { numericId: 355 },
    include: {
      trader: true
    }
  })

  if (!tx) {
    console.log('Transaction #355 not found!')
    return
  }

  if (!tx.trader) {
    console.log('Transaction has no trader!')
    return
  }

  console.log('Before acceptance:')
  console.log(`  Transaction status: ${tx.status}`)
  console.log(`  Trader balance: ${tx.trader.trustBalance}`)
  console.log(`  Trader frozen: ${tx.trader.frozenUsdt}`)
  console.log(`  Trader profit: ${tx.trader.profitFromDeals}`)

  // Выполним логику принятия транзакции
  await db.$transaction(async (prisma) => {
    // Обновляем статус транзакции
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { 
        status: Status.READY,
        acceptedAt: new Date()
      }
    })

    // Логика заморозки
    if (tx.frozenUsdtAmount && tx.calculatedCommission) {
      const totalFrozen = tx.frozenUsdtAmount + tx.calculatedCommission

      // Размораживаем средства
      await prisma.user.update({
        where: { id: tx.trader.id },
        data: {
          frozenUsdt: { decrement: totalFrozen }
        }
      })

      // Списываем замороженную сумму с траст баланса
      await prisma.user.update({
        where: { id: tx.trader.id },
        data: {
          trustBalance: { decrement: totalFrozen }
        }
      })

      // Начисляем прибыль трейдеру (комиссия)
      const profit = tx.calculatedCommission
      if (profit > 0) {
        await prisma.user.update({
          where: { id: tx.trader.id },
          data: {
            profitFromDeals: { increment: profit }
          }
        })
      }
    }
  })

  // Проверим результат
  const updatedTrader = await db.user.findUnique({
    where: { id: tx.trader.id }
  })

  const updatedTx = await db.transaction.findFirst({
    where: { numericId: 355 }
  })

  console.log('\nAfter acceptance:')
  console.log(`  Transaction status: ${updatedTx?.status}`)
  console.log(`  Trader balance: ${updatedTrader?.trustBalance}`)
  console.log(`  Trader frozen: ${updatedTrader?.frozenUsdt}`)
  console.log(`  Trader profit: ${updatedTrader?.profitFromDeals}`)

  console.log('\nCalculation details:')
  console.log(`  Total frozen was: ${tx.frozenUsdtAmount} + ${tx.calculatedCommission} = ${(tx.frozenUsdtAmount || 0) + (tx.calculatedCommission || 0)}`)
  console.log(`  Balance reduced by: ${(tx.frozenUsdtAmount || 0) + (tx.calculatedCommission || 0)}`)
  console.log(`  Profit increased by: ${tx.calculatedCommission} (commission only)`)
}

acceptTransaction355().catch(console.error).finally(() => process.exit(0))