import { db } from '../src/db'

async function fixTraderIssues() {
  try {
    const trader = await db.user.findUnique({
      where: { email: 'trader@test.com' }
    })

    if (!trader) {
      console.error('Трейдер не найден!')
      return
    }

    console.log('Найден трейдер:', trader.name)

    // 1. Найдем тестового мерчанта
    const merchant = await db.merchant.findUnique({
      where: { token: 'test-merchant-token' }
    })

    if (!merchant) {
      console.error('Тестовый мерчант не найден!')
      return
    }

    console.log('Найден мерчант:', merchant.name)

    // 2. Найдем все методы
    const methods = await db.method.findMany({
      where: { isEnabled: true }
    })

    console.log(`Найдено ${methods.length} активных методов`)

    // 3. Создаем связи трейдер-мерчант для всех методов
    for (const method of methods) {
      try {
        await db.traderMerchant.upsert({
          where: {
            traderId_merchantId_methodId: {
              traderId: trader.id,
              merchantId: merchant.id,
              methodId: method.id
            }
          },
          update: {
            isEnabled: true,
            feeIn: 2.5,
            feeOut: 1.5
          },
          create: {
            traderId: trader.id,
            merchantId: merchant.id,
            methodId: method.id,
            isEnabled: true,
            feeIn: 2.5,
            feeOut: 1.5
          }
        })
        console.log(`✓ Создана связь для метода ${method.name}`)
      } catch (error) {
        console.error(`Ошибка при создании связи для ${method.name}:`, error)
      }
    }

    // 4. Обновляем баланс трейдера (добавляем еще 2000 USDT как вы хотели)
    await db.user.update({
      where: { id: trader.id },
      data: {
        balanceUsdt: trader.balanceUsdt + 2000
      }
    })
    console.log('✓ Баланс увеличен на 2000 USDT')

    // 5. Отменяем старые зависшие транзакции, чтобы разморозить средства
    const stuckTransactions = await db.transaction.findMany({
      where: {
        traderId: trader.id,
        status: 'IN_PROGRESS',
        createdAt: {
          lt: new Date(Date.now() - 10 * 60 * 1000) // Старше 10 минут
        }
      }
    })

    console.log(`\nНайдено ${stuckTransactions.length} зависших транзакций`)

    for (const tx of stuckTransactions) {
      // Размораживаем средства
      if (tx.frozenUsdtAmount) {
        await db.user.update({
          where: { id: trader.id },
          data: {
            frozenUsdt: { decrement: tx.frozenUsdtAmount }
          }
        })
      }

      // Отменяем транзакцию
      await db.transaction.update({
        where: { id: tx.id },
        data: { status: 'CANCELED' }
      })

      console.log(`✓ Отменена транзакция ${tx.id}, разморожено ${tx.frozenUsdtAmount || 0} USDT`)
    }

    // Проверяем финальное состояние
    const updatedTrader = await db.user.findUnique({
      where: { id: trader.id },
      include: {
        traderMerchants: {
          include: {
            merchant: true,
            method: true
          }
        }
      }
    })

    console.log('\n=== ИТОГОВОЕ СОСТОЯНИЕ ===')
    console.log(`Баланс USDT: ${updatedTrader!.balanceUsdt}`)
    console.log(`Заморожено USDT: ${updatedTrader!.frozenUsdt}`)
    console.log(`Доступно USDT: ${updatedTrader!.balanceUsdt - updatedTrader!.frozenUsdt}`)
    console.log(`Связей с мерчантами: ${updatedTrader!.traderMerchants.length}`)

  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await db.$disconnect()
  }
}

fixTraderIssues()