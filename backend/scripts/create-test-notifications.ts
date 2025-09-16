import { db } from "../src/db"

async function createTestNotifications() {
  try {
    // Find the emulated device
    const device = await db.device.findFirst({
      where: { emulated: true }
    })
    
    if (!device) {
      console.log("❌ No emulated device found")
      return
    }
    
    console.log("📱 Creating notifications for device:", device.name)
    
    // Look for recent transactions to match
    const recentTransactions = await db.transaction.findMany({
      where: {
        status: "CREATED",
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Found ${recentTransactions.length} recent transactions`)
    
    // Create notifications - some matching transactions, some not
    const notifications = []
    
    // Create notifications matching transactions
    for (const tx of recentTransactions.slice(0, 3)) {
      const senders = ["Иван И.", "Мария П.", "Петр С."]
      const sender = senders[Math.floor(Math.random() * senders.length)]
      const balance = Math.floor(Math.random() * 50000 + 10000)
      
      notifications.push({
        message: `Перевод ${tx.amount.toLocaleString('ru-RU')} ₽ от ${sender}. Баланс: ${balance.toLocaleString('ru-RU')} ₽`,
        amount: tx.amount
      })
    }
    
    // Create random notifications
    const randomAmounts = [5500, 12300, 8900, 15600, 3200]
    for (const amount of randomAmounts) {
      const senders = ["Анна К.", "Сергей В.", "Елена М."]
      const sender = senders[Math.floor(Math.random() * senders.length)]
      const balance = Math.floor(Math.random() * 50000 + 10000)
      
      notifications.push({
        message: `Пополнение ${amount.toLocaleString('ru-RU')} ₽ от ${sender}. Баланс: ${balance.toLocaleString('ru-RU')} ₽`,
        amount
      })
    }
    
    // Create all notifications
    for (const notif of notifications) {
      await db.notification.create({
        data: {
          deviceId: device.id,
          type: "AppNotification",
          application: "ru.sberbankmobile",
          title: "СберБанк Онлайн",
          message: notif.message,
          metadata: {
            packageName: "ru.sberbankmobile",
            bankType: "SBER",
            amount: notif.amount,
            parsedAmount: notif.amount
          },
          isRead: false,
          isProcessed: false
        }
      })
      console.log(`   ✅ Created: ${notif.message}`)
    }
    
    console.log(`\n🎯 Created ${notifications.length} notifications!`)
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

createTestNotifications()