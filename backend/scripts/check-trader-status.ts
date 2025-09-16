import { db } from '../src/db'

async function checkTraderStatus() {
  try {
    // Найдем трейдера
    const trader = await db.user.findUnique({
      where: { email: 'trader@test.com' },
      include: {
        bankDetails: {
          where: { isArchived: false }
        },
        traderMerchants: {
          include: {
            merchant: true,
            method: true
          }
        }
      }
    })

    if (!trader) {
      console.error('Трейдер не найден!')
      return
    }

    console.log('=== ИНФОРМАЦИЯ О ТРЕЙДЕРЕ ===')
    console.log(`Имя: ${trader.name}`)
    console.log(`Email: ${trader.email}`)
    console.log(`Баланс USDT: ${trader.balanceUsdt}`)
    console.log(`Заморожено USDT: ${trader.frozenUsdt}`)
    console.log(`Доступно USDT: ${trader.balanceUsdt - trader.frozenUsdt}`)
    console.log(`Трафик включен: ${trader.trafficEnabled ? 'Да' : 'Нет'}`)
    console.log(`Забанен: ${trader.banned ? 'Да' : 'Нет'}`)

    console.log('\n=== РЕКВИЗИТЫ ===')
    if (trader.bankDetails.length === 0) {
      console.log('❌ Нет активных реквизитов!')
    } else {
      trader.bankDetails.forEach((bd, i) => {
        console.log(`\nРеквизит ${i + 1}:`)
        console.log(`  Банк: ${bd.bankType}`)
        console.log(`  Карта: ${bd.cardNumber}`)
        console.log(`  Лимиты: ${bd.minAmount} - ${bd.maxAmount}`)
        console.log(`  Дневной лимит: ${bd.dailyLimit}`)
        console.log(`  Архивирован: ${bd.isArchived ? 'Да' : 'Нет'}`)
      })
    }

    console.log('\n=== СВЯЗИ С МЕРЧАНТАМИ ===')
    if (trader.traderMerchants.length === 0) {
      console.log('❌ Нет связей с мерчантами!')
      console.log('Это может быть причиной отсутствия транзакций.')
    } else {
      trader.traderMerchants.forEach((tm) => {
        console.log(`\nМерчант: ${tm.merchant.name}`)
        console.log(`  Метод: ${tm.method.name}`)
        console.log(`  Комиссия на ввод: ${tm.feeIn || 0}%`)
        console.log(`  Комиссия на вывод: ${tm.feeOut || 0}%`)
        console.log(`  Включен: ${tm.isEnabled ? 'Да' : 'Нет'}`)
      })
    }

    // Проверим последние транзакции
    const recentTransactions = await db.transaction.findMany({
      where: { traderId: trader.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        method: true,
        merchant: true
      }
    })

    console.log('\n=== ПОСЛЕДНИЕ ТРАНЗАКЦИИ ===')
    if (recentTransactions.length === 0) {
      console.log('Нет транзакций')
    } else {
      recentTransactions.forEach((tx) => {
        console.log(`\nID: ${tx.id}`)
        console.log(`  Сумма: ${tx.amount} RUB`)
        console.log(`  Статус: ${tx.status}`)
        console.log(`  Мерчант: ${tx.merchant.name}`)
        console.log(`  Создана: ${tx.createdAt}`)
      })
    }

  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await db.$disconnect()
  }
}

checkTraderStatus()