import { db } from '../src/db'

async function resetTradersForTesting() {
  console.log('=== RESETTING TRADERS FOR TESTING ===\n')

  // 1. Удаляем все транзакции
  console.log('1. Deleting all transactions...')
  const deletedTx = await db.transaction.deleteMany({})
  console.log(`   ✓ Deleted ${deletedTx.count} transactions`)

  // 2. Сбрасываем счетчик транзакций
  console.log('\n2. Resetting transaction counter...')
  await db.$executeRaw`ALTER SEQUENCE "Transaction_numericId_seq" RESTART WITH 1`
  console.log('   ✓ Transaction counter reset to 1')

  // 3. Обнуляем заморозку и устанавливаем нормальные балансы для всех трейдеров
  console.log('\n3. Resetting trader balances...')
  
  const traders = await db.user.findMany({
    where: { 
      email: { in: ['trader@test.com', 'trader@example.com'] }
    }
  })

  for (const trader of traders) {
    const updated = await db.user.update({
      where: { id: trader.id },
      data: {
        trustBalance: 50000,     // 50k USDT для тестирования
        frozenUsdt: 0,           // Обнуляем заморозку
        frozenRub: 0,            // Обнуляем заморозку RUB
        balanceUsdt: 0,          // Не используем
        balanceRub: 0,           // Не используем
        profitFromDeals: 0,      // Обнуляем прибыль
        profitFromPayouts: 0,    // Обнуляем прибыль
        trafficEnabled: true     // Включаем трафик
      }
    })
    
    console.log(`   ✓ ${updated.email}:`)
    console.log(`     - Trust Balance: ${updated.trustBalance} USDT`)
    console.log(`     - Frozen: ${updated.frozenUsdt} USDT`)
    console.log(`     - Traffic: ${updated.trafficEnabled ? 'ON' : 'OFF'}`)
  }

  // 4. Merchant balances are stored in Merchant table
  console.log('\n4. Merchant balances (stored in Merchant table, no reset needed)')

  // 5. Проверяем TraderMerchant связи
  console.log('\n5. Checking TraderMerchant relationships...')
  for (const trader of traders) {
    const count = await db.traderMerchant.count({
      where: { traderId: trader.id }
    })
    console.log(`   - ${trader.email}: ${count} merchant relationships`)
  }

  // 6. Проверяем банковские реквизиты
  console.log('\n6. Checking bank details...')
  for (const trader of traders) {
    const count = await db.bankDetail.count({
      where: { 
        userId: trader.id,
        isArchived: false
      }
    })
    console.log(`   - ${trader.email}: ${count} active bank details`)
  }

  console.log('\n✅ RESET COMPLETE!')
  console.log('\nTraders are ready for testing with:')
  console.log('- 50,000 USDT balance each')
  console.log('- 0 frozen USDT')
  console.log('- No transactions')
  console.log('- Traffic enabled')
}

resetTradersForTesting().catch(console.error).finally(() => process.exit(0))