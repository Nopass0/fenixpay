import { db } from "../src/db"

async function cleanAndResetDatabase() {
  try {
    console.log("🧹 Starting database cleanup and reset...\n")
    
    // 1. Удаляем все уведомления
    console.log("📬 Deleting all notifications...")
    const deletedNotifications = await db.notification.deleteMany()
    console.log(`   Deleted ${deletedNotifications.count} notifications`)
    
    // 2. Удаляем все транзакции
    console.log("\n💸 Deleting all transactions...")
    const deletedTransactions = await db.transaction.deleteMany()
    console.log(`   Deleted ${deletedTransactions.count} transactions`)
    
    // 3. Удаляем все банковские детали
    console.log("\n🏦 Deleting all bank details...")
    const deletedBankDetails = await db.bankDetail.deleteMany()
    console.log(`   Deleted ${deletedBankDetails.count} bank details`)
    
    // 4. Удаляем все устройства
    console.log("\n📱 Deleting all devices...")
    const deletedDevices = await db.device.deleteMany()
    console.log(`   Deleted ${deletedDevices.count} devices`)
    
    // 5. Обновляем балансы всех пользователей
    console.log("\n💰 Updating user balances...")
    const users = await db.user.findMany()
    console.log(`   Found ${users.length} users`)
    
    for (const user of users) {
      await db.user.update({
        where: { id: user.id },
        data: {
          balanceRub: 10000,
          balanceUsdt: 10000,
          frozenRub: 0,
          frozenUsdt: 0,
          trustBalance: 0,
          profitFromDeals: 0,
          profitFromPayouts: 0
        }
      })
      console.log(`   ✅ Updated ${user.name} (${user.email})`)
    }
    
    // 6. Очищаем конфигурацию эмулятора
    console.log("\n🤖 Resetting Device Emulator Service config...")
    const emulatorConfig = {
      global: {
        defaultPingSec: 60,
        defaultNotifyChance: 0.4,
        defaultSpamChance: 0.05,
        defaultDelayChance: 0.1,
        reconnectOnAuthError: true,
      },
      devices: []
    }
    
    await db.serviceConfig.update({
      where: { serviceKey: "device_emulator" },
      data: { 
        config: emulatorConfig,
        isEnabled: false
      }
    })
    console.log("   ✅ Emulator config reset and disabled")
    
    // 7. Показываем итоговую статистику
    console.log("\n📊 Final statistics:")
    console.log("   Users:", users.length)
    console.log("   Devices:", 0)
    console.log("   Bank details:", 0)
    console.log("   Transactions:", 0)
    console.log("   Notifications:", 0)
    console.log("   All users balance: 10,000 RUB / 10,000 USDT")
    
    console.log("\n✅ Database cleanup and reset completed successfully!")
    
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error)
  } finally {
    await db.$disconnect()
  }
}

// Запуск очистки
cleanAndResetDatabase()