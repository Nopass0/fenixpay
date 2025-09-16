import { db } from "../src/db"

async function forceDeviceOnline() {
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
    console.log("   Current status:", device.isOnline ? "🟢 Online" : "🔴 Offline")
    
    // Force device online
    await db.device.update({
      where: { id: device.id },
      data: {
        isOnline: true,
        lastActiveAt: new Date(),
        energy: 85,
        ethernetSpeed: 100
      }
    })
    
    console.log("✅ Device forced online")
    
    // Create more notifications
    const messages = [
      "Перевод 1,234.50 ₽ от Мария П. Баланс: 45,678.90 ₽",
      "Пополнение 10,000.00 ₽. Баланс: 55,678.90 ₽", 
      "Покупка 567.00 ₽ в Пятерочка. Баланс: 55,111.90 ₽",
      "Перевод 2,500.00 ₽ от Петр С. Баланс: 57,611.90 ₽"
    ]
    
    for (const msg of messages) {
      await db.notification.create({
        data: {
          deviceId: device.id,
          type: "AppNotification",
          application: "ru.sberbankmobile",
          title: "СберБанк Онлайн",
          message: msg,
          metadata: {
            bankType: "SBER"
          },
          isRead: false,
          isProcessed: false
        }
      })
      console.log("   ✅ Created:", msg)
    }
    
    console.log("\n🎯 Device is now online with 5 notifications!")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

forceDeviceOnline()