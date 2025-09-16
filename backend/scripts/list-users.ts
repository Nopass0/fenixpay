import { db } from '../src/db'

async function listUsers() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        banned: true,
        createdAt: true
      }
    })

    console.log('Пользователи в базе данных:')
    console.log('==========================\n')
    
    users.forEach(user => {
      console.log(`Имя: ${user.name}`)
      console.log(`Email: ${user.email}`)
      console.log(`Пароль (хеш): ${user.password}`)
      console.log(`Забанен: ${user.banned ? 'Да' : 'Нет'}`)
      console.log(`Создан: ${user.createdAt}`)
      console.log('---')
    })

    console.log(`\nВсего пользователей: ${users.length}`)
  } catch (error) {
    console.error('Ошибка:', error)
  } finally {
    await db.$disconnect()
  }
}

listUsers()