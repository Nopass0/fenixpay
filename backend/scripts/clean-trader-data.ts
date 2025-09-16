import { db } from "../src/db"

async function cleanTraderData() {
  try {
    console.log("🧹 Cleaning data for trader@example.com...\n")
    
    // Найти трейдера
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        devices: true,
        bankDetails: true
      }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    console.log("✅ Found trader:", trader.email)
    console.log(`   Devices: ${trader.devices.length}`)
    console.log(`   Bank details: ${trader.bankDetails.length}`)
    
    // 1. Удаляем уведомления связанные с устройствами трейдера
    if (trader.devices.length > 0) {
      console.log("\n📬 Deleting notifications for trader's devices...")
      const deviceIds = trader.devices.map(d => d.id)
      
      const deletedNotifications = await db.notification.deleteMany({
        where: {
          deviceId: { in: deviceIds }
        }
      })
      
      console.log(`   Deleted ${deletedNotifications.count} notifications`)
    }
    
    // 2. Удаляем устройства трейдера
    console.log("\n📱 Deleting trader's devices...")
    const deletedDevices = await db.device.deleteMany({
      where: {
        userId: trader.id
      }
    })
    
    console.log(`   Deleted ${deletedDevices.count} devices`)
    
    // 3. Удаляем банковские реквизиты трейдера
    console.log("\n🏦 Deleting trader's bank details...")
    const deletedBankDetails = await db.bankDetail.deleteMany({
      where: {
        userId: trader.id
      }
    })
    
    console.log(`   Deleted ${deletedBankDetails.count} bank details`)
    
    // 4. Проверяем результат
    const updatedTrader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        devices: true,
        bankDetails: true
      }
    })
    
    console.log("\n📊 Final status for trader@example.com:")
    console.log(`   Devices: ${updatedTrader?.devices.length || 0}`)
    console.log(`   Bank details: ${updatedTrader?.bankDetails.length || 0}`)
    console.log(`   Balance RUB: ${updatedTrader?.balanceRub || 0}`)
    console.log(`   Balance USDT: ${updatedTrader?.balanceUsdt || 0}`)
    
    console.log("\n✅ Trader data cleaned successfully!")
    
  } catch (error) {
    console.error("\n❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

// Запуск очистки
cleanTraderData()