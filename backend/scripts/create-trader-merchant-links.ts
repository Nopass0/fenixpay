import { db } from '../src/db'

async function createTraderMerchantLinks() {
  try {
    const trader = await db.user.findUnique({
      where: { email: 'trader@test.com' }
    })

    const merchant = await db.merchant.findUnique({
      where: { token: 'test-merchant-token' }
    })

    if (!trader || !merchant) {
      console.error('Трейдер или мерчант не найдены!')
      return
    }

    // Получаем все активные методы
    const methods = await db.method.findMany({
      where: { isEnabled: true }
    })

    console.log(`Создаем связи для ${methods.length} методов...`)

    for (const method of methods) {
      try {
        const link = await db.traderMerchant.upsert({
          where: {
            traderId_merchantId_methodId: {
              traderId: trader.id,
              merchantId: merchant.id,
              methodId: method.id
            }
          },
          update: {
            isMerchantEnabled: true,
            isFeeInEnabled: true,
            isFeeOutEnabled: true,
            feeIn: 2.5,
            feeOut: 1.5
          },
          create: {
            traderId: trader.id,
            merchantId: merchant.id,
            methodId: method.id,
            isMerchantEnabled: true,
            isFeeInEnabled: true,
            isFeeOutEnabled: true,
            feeIn: 2.5,
            feeOut: 1.5
          }
        })
        console.log(`✓ Создана связь для метода ${method.name}`)
      } catch (error) {
        console.error(`Ошибка при создании связи для ${method.name}:`, error)
      }
    }

    // Проверяем результат
    const traderWithLinks = await db.user.findUnique({
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

    console.log(`\n✅ Создано ${traderWithLinks!.traderMerchants.length} связей с мерчантами`)
    console.log('\nТеперь трейдер может получать транзакции от следующих методов:')
    traderWithLinks!.traderMerchants.forEach(tm => {
      console.log(`- ${tm.method.name} (комиссия ввод: ${tm.feeIn}%, вывод: ${tm.feeOut}%)`)
    })

  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await db.$disconnect()
  }
}

createTraderMerchantLinks()