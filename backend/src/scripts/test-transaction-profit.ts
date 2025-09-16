import { db } from "../db"
import { Status } from "@prisma/client"
import { roundDown2 } from "../utils/rounding"

async function main() {
  const trader = await db.user.findFirst({
    where: { email: 'trader@test.com' }
  })
  
  if (!trader) {
    console.log('Test trader not found')
    return
  }

  console.log('Initial trader state:')
  console.log('Trust balance:', trader.trustBalance)
  console.log('Frozen USDT:', trader.frozenUsdt)
  console.log('Profit from deals:', trader.profitFromDeals)
  
  // Найдем транзакцию IN_PROGRESS для тестирования
  const testTx = await db.transaction.findFirst({
    where: {
      traderId: trader.id,
      type: 'IN',
      status: Status.IN_PROGRESS,
      frozenUsdtAmount: { gt: 0 }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (!testTx) {
    console.log('\nNo IN_PROGRESS transactions found for testing')
    return
  }

  console.log('\n\nTest transaction:')
  console.log('ID:', testTx.id)
  console.log('Amount:', testTx.amount, 'RUB')
  console.log('Frozen USDT:', testTx.frozenUsdtAmount)
  console.log('Commission:', testTx.calculatedCommission)
  console.log('Total frozen:', (testTx.frozenUsdtAmount || 0) + (testTx.calculatedCommission || 0))

  // Симулируем переход в READY
  console.log('\n\nSimulating status change IN_PROGRESS → READY...')
  
  await db.$transaction(async (prisma) => {
    // Обновляем статус транзакции
    await prisma.transaction.update({
      where: { id: testTx.id },
      data: { 
        status: Status.READY,
        acceptedAt: new Date()
      }
    })

    const totalFrozen = (testTx.frozenUsdtAmount || 0) + (testTx.calculatedCommission || 0)
    
    if (totalFrozen > 0) {
      // Размораживаем средства
      console.log(`- Unfreezing ${totalFrozen} USDT`)
      await prisma.user.update({
        where: { id: trader.id },
        data: {
          frozenUsdt: { decrement: totalFrozen }
        }
      })

      // Списываем с траст баланса
      console.log(`- Deducting ${totalFrozen} USDT from trust balance`)
      await prisma.user.update({
        where: { id: trader.id },
        data: {
          trustBalance: { decrement: totalFrozen }
        }
      })

      // Начисляем прибыль (комиссию)
      const profit = roundDown2(testTx.calculatedCommission || 0)
      if (profit > 0) {
        console.log(`- Adding profit ${profit} USDT`)
        await prisma.user.update({
          where: { id: trader.id },
          data: {
            profitFromDeals: { increment: profit }
          }
        })
      } else {
        console.log('- No profit to add (commission is 0)')
      }
    }
  })

  // Проверяем результат
  const updatedTrader = await db.user.findUnique({
    where: { id: trader.id }
  })

  console.log('\n\nFinal trader state:')
  console.log('Trust balance:', updatedTrader?.trustBalance, `(${(updatedTrader?.trustBalance || 0) - trader.trustBalance})`)
  console.log('Frozen USDT:', updatedTrader?.frozenUsdt, `(${(updatedTrader?.frozenUsdt || 0) - trader.frozenUsdt})`)
  console.log('Profit from deals:', updatedTrader?.profitFromDeals, `(+${(updatedTrader?.profitFromDeals || 0) - trader.profitFromDeals})`)

  await db.$disconnect()
}

main().catch(console.error)