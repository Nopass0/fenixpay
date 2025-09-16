import { db } from '../src/db'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

async function createTrader() {
  try {
    // Проверяем, какой хеш у пароля test123
    console.log('Хеш для test123:', hashPassword('test123'))
    console.log('Хеш для d2483abb1fd002ae:', hashPassword('d2483abb1fd002ae'))

    // Создаем или обновляем пользователя с email trader@example.com
    const user = await db.user.upsert({
      where: { email: 'trader@example.com' },
      update: {
        password: hashPassword('d2483abb1fd002ae'),
        banned: false
      },
      create: {
        email: 'trader@example.com',
        name: 'Example Trader',
        password: hashPassword('d2483abb1fd002ae'),
        balanceUsdt: 10000,
        balanceRub: 0,
        frozenUsdt: 0,
        profitFromDeals: 0,
        profitFromPayouts: 0,
        banned: false
      }
    })

    console.log('\n✅ Пользователь создан/обновлен:')
    console.log('Email:', user.email)
    console.log('Password:', 'd2483abb1fd002ae')
    console.log('ID:', user.id)

  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await db.$disconnect()
  }
}

createTrader()