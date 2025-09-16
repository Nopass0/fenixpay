import { db } from '../src/db'

async function resetSystem() {
  console.log('=== SYSTEM RESET ===\n')

  // 1. Удаляем все транзакции
  console.log('1. Deleting all transactions...')
  const deletedTx = await db.transaction.deleteMany()
  console.log(`✓ Deleted ${deletedTx.count} transactions`)

  // 2. Сбрасываем заморозку и устанавливаем нормальный баланс трейдерам
  console.log('\n2. Resetting trader balances...')
  const traders = await db.user.findMany({
    where: {
      email: { in: ['trader@test.com', 'trader@example.com'] }
    }
  })

  for (const trader of traders) {
    await db.user.update({
      where: { id: trader.id },
      data: {
        frozenUsdt: 0,
        trustBalance: 50000  // Устанавливаем баланс 50,000 USDT каждому трейдеру
      }
    })
    console.log(`✓ ${trader.email}: Balance set to 50,000 USDT, frozen amount reset to 0`)
  }

  // 3. Устанавливаем комиссию 8% для всех методов
  console.log('\n3. Setting 8% commission for all payment methods...')
  const methods = await db.method.updateMany({
    data: {
      commissionPayin: 8
    }
  })
  console.log(`✓ Updated ${methods.count} payment methods with 8% commission`)

  // 4. Показываем финальное состояние
  console.log('\n=== FINAL STATE ===')
  
  // Показываем трейдеров
  const finalTraders = await db.user.findMany({
    where: {
      email: { in: ['trader@test.com', 'trader@example.com'] }
    },
    select: {
      email: true,
      trustBalance: true,
      frozenUsdt: true
    }
  })

  console.log('\nTraders:')
  for (const trader of finalTraders) {
    console.log(`  ${trader.email}:`)
    console.log(`    Balance: ${trader.trustBalance} USDT`)
    console.log(`    Frozen: ${trader.frozenUsdt} USDT`)
  }

  // Показываем методы
  const finalMethods = await db.method.findMany({
    select: {
      name: true,
      commissionPayin: true,
      commissionPayout: true
    }
  })

  console.log('\nPayment Methods:')
  for (const method of finalMethods) {
    console.log(`  ${method.name}:`)
    console.log(`    Commission In: ${method.commissionPayin}%`)
    console.log(`    Commission Out: ${method.commissionPayout}%`)
  }

  console.log('\n✅ System reset complete!')
}

resetSystem().catch(console.error).finally(() => process.exit(0))