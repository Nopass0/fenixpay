import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function completeCleanupAndReset() {
  try {
    console.log("🧹 Starting complete system cleanup and reset...\n")
    
    // 1. Обнуляем все балансы пользователей
    console.log("💰 Resetting all user balances...")
    const updatedUsers = await db.user.updateMany({
      data: {
        balanceUsdt: 0,
        balanceRub: 0,
        frozenUsdt: 0,
        frozenRub: 0,
        trustBalance: 0,
        profitFromDeals: 0,
        profitFromPayouts: 0,
        deposit: 0
      }
    })
    console.log(`✅ Reset balances for ${updatedUsers.count} users`)
    
    // 2. Удаляем все уведомления
    console.log("\n📬 Deleting all notifications...")
    const deletedNotifications = await db.notification.deleteMany({})
    console.log(`✅ Deleted ${deletedNotifications.count} notifications`)
    
    // 3. Удаляем все устройства
    console.log("\n📱 Deleting all devices...")
    const deletedDevices = await db.device.deleteMany({})
    console.log(`✅ Deleted ${deletedDevices.count} devices`)
    
    // 4. Удаляем все реквизиты
    console.log("\n🏦 Deleting all bank details...")
    const deletedBankDetails = await db.bankDetail.deleteMany({})
    console.log(`✅ Deleted ${deletedBankDetails.count} bank details`)
    
    // 5. Удаляем все транзакции
    console.log("\n💸 Deleting all transactions...")
    const deletedTransactions = await db.transaction.deleteMany({})
    console.log(`✅ Deleted ${deletedTransactions.count} transactions`)
    
    // 6. Отключаем и очищаем Device Emulator Service
    console.log("\n🤖 Cleaning Device Emulator Service...")
    await db.serviceConfig.upsert({
      where: { serviceKey: "device_emulator" },
      create: {
        serviceKey: "device_emulator",
        config: {
          global: {
            defaultPingSec: 30,
            defaultNotifyChance: 0.1,
            defaultSpamChance: 0.1,
            defaultDelayChance: 0.1,
            reconnectOnAuthError: true,
            rngSeed: Date.now()
          },
          devices: []
        },
        isEnabled: false,
      },
      update: {
        config: {
          global: {
            defaultPingSec: 30,
            defaultNotifyChance: 0.1,
            defaultSpamChance: 0.1,
            defaultDelayChance: 0.1,
            reconnectOnAuthError: true,
            rngSeed: Date.now()
          },
          devices: []
        },
        isEnabled: false,
      }
    })
    console.log("✅ Device Emulator Service disabled and cleared")
    
    // 7. Удаляем все другие конфигурации сервисов
    console.log("\n⚙️ Cleaning other service configurations...")
    const allConfigs = await db.serviceConfig.findMany()
    console.log(`Found ${allConfigs.length} service configurations`)
    
    for (const config of allConfigs) {
      if (config.serviceKey !== "device_emulator") {
        await db.serviceConfig.delete({
          where: { id: config.id }
        })
        console.log(`   Deleted config: ${config.serviceKey}`)
      }
    }
    
    // 8. Показываем итоговое состояние
    console.log("\n📊 Final state after cleanup:")
    
    const stats = {
      users: await db.user.count(),
      devices: await db.device.count(),
      bankDetails: await db.bankDetail.count(),
      transactions: await db.transaction.count(),
      notifications: await db.notification.count(),
      sessions: await db.session.count(),
      serviceConfigs: await db.serviceConfig.count()
    }
    
    console.log(`   Users: ${stats.users}`)
    console.log(`   Devices: ${stats.devices}`)
    console.log(`   Bank Details: ${stats.bankDetails}`)
    console.log(`   Transactions: ${stats.transactions}`)
    console.log(`   Notifications: ${stats.notifications}`)
    console.log(`   Sessions: ${stats.sessions}`)
    console.log(`   Service Configs: ${stats.serviceConfigs}`)
    
    // 9. Проверяем балансы
    const usersWithBalances = await db.user.findMany({
      where: {
        OR: [
          { balanceUsdt: { gt: 0 } },
          { balanceRub: { gt: 0 } },
          { frozenUsdt: { gt: 0 } },
          { frozenRub: { gt: 0 } },
          { trustBalance: { gt: 0 } },
          { profitFromDeals: { gt: 0 } },
          { profitFromPayouts: { gt: 0 } },
          { deposit: { gt: 0 } }
        ]
      },
      select: {
        email: true,
        balanceUsdt: true,
        balanceRub: true,
        frozenUsdt: true,
        frozenRub: true,
        trustBalance: true,
        profitFromDeals: true,
        profitFromPayouts: true,
        deposit: true
      }
    })
    
    console.log(`\n💰 Users with non-zero balances: ${usersWithBalances.length}`)
    if (usersWithBalances.length > 0) {
      usersWithBalances.forEach(user => {
        console.log(`   ${user.email}: USDT=${user.balanceUsdt}/${user.frozenUsdt}, RUB=${user.balanceRub}/${user.frozenRub}, trust=${user.trustBalance}, profit=${user.profitFromDeals}/${user.profitFromPayouts}, deposit=${user.deposit}`)
      })
    }
    
    console.log("\n🎉 Complete cleanup finished!")
    console.log("\n📋 System is now in clean state:")
    console.log("   ✅ All balances reset to 0")
    console.log("   ✅ All devices removed")
    console.log("   ✅ All bank details removed")
    console.log("   ✅ All transactions removed")
    console.log("   ✅ All notifications removed")
    console.log("   ✅ Device Emulator Service disabled and cleared")
    console.log("   ✅ All service configurations cleaned")
    
    console.log("\n🔄 Ready for fresh setup!")
    
  } catch (error: any) {
    console.error("\n❌ Cleanup error:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

completeCleanupAndReset()