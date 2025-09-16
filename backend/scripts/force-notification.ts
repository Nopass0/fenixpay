import { db } from "../src/db"

async function forceNotification() {
  try {
    // Find the emulated device
    const device = await db.device.findFirst({
      where: { 
        emulated: true
      }
    })
    
    if (!device) {
      console.log("❌ No emulated device found")
      return
    }
    
    console.log("📱 Found device:", device.name)
    console.log("   Token:", device.token)
    console.log("   Online:", device.isOnline)
    
    // Create a test notification
    const notification = await db.notification.create({
      data: {
        deviceId: device.id,
        type: "AppNotification",
        application: "ru.sberbankmobile",
        title: "СберБанк Онлайн",
        message: "Перевод 5,000.00 ₽ от Иван И. Баланс: 25,431.50 ₽",
        metadata: {
          amount: 5000,
          balance: 25431.50,
          sender: "Иван И.",
          bankType: "SBER"
        },
        isRead: false,
        isProcessed: false
      }
    })
    
    console.log("\n✅ Created test notification:")
    console.log("   ID:", notification.id)
    console.log("   Type:", notification.type)
    console.log("   Message:", notification.message)
    console.log("\n🎯 Notification should appear in the device messages!")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

forceNotification()