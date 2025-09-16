import { db } from "../src/db"

async function resetTraderForCleanTest() {
  try {
    console.log("🧹 Resetting trader for clean testing...\n")
    
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        devices: true,
        bankDetails: true,
        sessions: true
      }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    console.log("✅ Found trader:", trader.email)
    console.log(`   Devices: ${trader.devices.length}`)
    console.log(`   Bank details: ${trader.bankDetails.length}`)
    console.log(`   Sessions: ${trader.sessions.length}`)
    
    // 1. Удаляем все уведомления для устройств трейдера
    if (trader.devices.length > 0) {
      const deviceIds = trader.devices.map(d => d.id)
      const deletedNotifications = await db.notification.deleteMany({
        where: { deviceId: { in: deviceIds } }
      })
      console.log(`📬 Deleted ${deletedNotifications.count} notifications`)
    }
    
    // 2. Удаляем все устройства
    const deletedDevices = await db.device.deleteMany({
      where: { userId: trader.id }
    })
    console.log(`📱 Deleted ${deletedDevices.count} devices`)
    
    // 3. Удаляем все банковские детали
    const deletedBankDetails = await db.bankDetail.deleteMany({
      where: { userId: trader.id }
    })
    console.log(`🏦 Deleted ${deletedBankDetails.count} bank details`)
    
    // 4. Удаляем все сессии
    const deletedSessions = await db.session.deleteMany({
      where: { userId: trader.id }
    })
    console.log(`🔑 Deleted ${deletedSessions.count} sessions`)
    
    // 5. Очищаем emulator config
    console.log("\n🤖 Clearing emulator config...")
    const emptyConfig = {
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
        config: emptyConfig,
        isEnabled: false
      }
    })
    
    console.log("✅ Emulator config cleared")
    
    // 6. Проверяем результат
    const cleanTrader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        devices: true,
        bankDetails: true,
        sessions: true
      }
    })
    
    console.log("\n📊 Final status:")
    console.log(`   Devices: ${cleanTrader?.devices.length || 0}`)
    console.log(`   Bank details: ${cleanTrader?.bankDetails.length || 0}`)
    console.log(`   Sessions: ${cleanTrader?.sessions.length || 0}`)
    console.log(`   Balance RUB: ${cleanTrader?.balanceRub || 0}`)
    console.log(`   Balance USDT: ${cleanTrader?.balanceUsdt || 0}`)
    
    console.log("\n✅ Trader reset completed! Ready for clean testing.")
    
  } catch (error) {
    console.error("\n❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

resetTraderForCleanTest()