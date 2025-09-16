import { db } from '../src/db'
import { BankType, MethodType } from '@prisma/client'

async function addTestRequisites() {
  try {
    // Найдем тестового трейдера
    const trader = await db.user.findUnique({
      where: { email: 'trader@test.com' }
    })

    if (!trader) {
      console.error('❌ Тестовый трейдер не найден!')
      return
    }

    console.log(`✓ Найден трейдер: ${trader.name} (${trader.email})`)

    // Создаем реквизиты для разных банков
    const requisites = [
      {
        bankType: BankType.SBERBANK,
        cardNumber: '1234 5678 9012 3456',
        recipientName: 'ИВАН ИВАНОВ',
        methodType: MethodType.c2c,
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        userId: trader.id
      },
      {
        bankType: BankType.TBANK,
        cardNumber: '2345 6789 0123 4567',
        recipientName: 'ИВАН ИВАНОВ',
        methodType: MethodType.c2c,
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        userId: trader.id
      },
      {
        bankType: BankType.VTB,
        cardNumber: '3456 7890 1234 5678',
        recipientName: 'ИВАН ИВАНОВ',
        methodType: MethodType.c2c,
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        userId: trader.id
      }
    ]

    for (const requisite of requisites) {
      try {
        const existing = await db.bankDetail.findFirst({
          where: {
            userId: trader.id,
            bankType: requisite.bankType,
            cardNumber: requisite.cardNumber
          }
        })

        if (!existing) {
          await db.bankDetail.create({
            data: requisite
          })
          console.log(`✓ Добавлен реквизит ${requisite.bankType}: ${requisite.cardNumber}`)
        } else {
          console.log(`- Реквизит ${requisite.bankType} уже существует`)
        }
      } catch (error) {
        console.error(`Ошибка при добавлении реквизита ${requisite.bankType}:`, error)
      }
    }

    console.log('\n✅ Тестовые реквизиты успешно добавлены!')

  } catch (error) {
    console.error('❌ Ошибка при добавлении реквизитов:', error)
  } finally {
    await db.$disconnect()
  }
}

addTestRequisites()