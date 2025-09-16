import { db } from "../src/db"

async function createProperNotifications() {
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
    
    // Create notifications with proper metadata
    const notifications = [
      {
        message: "Перевод 5,000.00 ₽ от Иван И. Баланс: 25,431.50 ₽",
        metadata: {
          packageName: "ru.sberbankmobile",
          bankType: "SBER",
          amount: 5000,
          balance: 25431.50,
          sender: "Иван И."
        }
      },
      {
        message: "Пополнение 10,000.00 ₽. Баланс: 55,678.90 ₽",
        metadata: {
          packageName: "ru.sberbankmobile", 
          bankType: "SBER",
          amount: 10000,
          balance: 55678.90
        }
      },
      {
        message: "Перевод 2,500.00 ₽ от Петр С. Баланс: 57,611.90 ₽",
        metadata: {
          packageName: "ru.sberbankmobile",
          bankType: "SBER",
          amount: 2500,
          balance: 57611.90,
          sender: "Петр С."
        }
      }
    ]
    
    for (const notif of notifications) {
      const created = await db.notification.create({
        data: {
          deviceId: device.id,
          type: "AppNotification",
          application: "ru.sberbankmobile",
          title: "СберБанк Онлайн",
          message: notif.message,
          metadata: notif.metadata,
          isRead: false,
          isProcessed: false
        }
      })
      console.log("   ✅ Created:", notif.message)
    }
    
    console.log("\n🎯 Created 3 notifications with proper metadata!")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

createProperNotifications()