import { db } from '../src/db'

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

    // Добавляем реквизиты через raw SQL
    await db.$executeRaw`
      INSERT INTO "BankDetail" 
      ("id", "userId", "methodType", "bankType", "cardNumber", "recipientName", "minAmount", "maxAmount", "dailyLimit", "monthlyLimit", "createdAt")
      VALUES 
      (gen_random_uuid(), ${trader.id}, 'c2c', 'SBER', '1234 5678 9012 3456', 'ИВАН ИВАНОВ', 100, 50000, 500000, 5000000, NOW()),
      (gen_random_uuid(), ${trader.id}, 'c2c', 'TINKOFF', '2345 6789 0123 4567', 'ИВАН ИВАНОВ', 100, 50000, 500000, 5000000, NOW()),
      (gen_random_uuid(), ${trader.id}, 'c2c', 'VTB', '3456 7890 1234 5678', 'ИВАН ИВАНОВ', 100, 50000, 500000, 5000000, NOW())
      ON CONFLICT DO NOTHING
    `

    console.log('✅ Реквизиты успешно добавлены!')

  } catch (error) {
    console.error('❌ Ошибка при добавлении реквизитов:', error)
  } finally {
    await db.$disconnect()
  }
}

addTestRequisites()