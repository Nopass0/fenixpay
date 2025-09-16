import { db } from "../src/db"
import { NotificationType } from "@prisma/client"

async function sendMatchingNotification() {
  try {
    console.log("📬 Sending notification to test matching...\n")
    
    // 1. Find an active transaction
    const transaction = await db.transaction.findFirst({
      where: {
        status: "CREATED",
        type: "IN",
        bankDetailId: { not: null }
      },
      include: {
        requisites: {
          include: {
            device: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!transaction || !transaction.requisites?.device) {
      console.log("❌ No suitable transaction found with device")
      return
    }
    
    const device = transaction.requisites.device
    const amount = transaction.amount
    
    console.log("✅ Found transaction:")
    console.log(`   ID: ${transaction.id}`)
    console.log(`   Amount: ${amount} RUB`)
    console.log(`   Status: ${transaction.status}`)
    console.log(`   Device: ${device.name}`)
    console.log(`   Bank: ${transaction.requisites.bankType}`)
    
    // 2. Create notification that will match
    const notification = await db.notification.create({
      data: {
        deviceId: device.id,
        title: "Пополнение",
        message: `Пополнение на ${amount.toLocaleString('ru-RU')} ₽ от Тест И. Баланс: ${(amount * 3).toLocaleString('ru-RU')} ₽`,
        metadata: {
          packageName: "ru.sberbank.android",
          appName: "СберБанк Онлайн",
          timestamp: Date.now(),
          priority: 1,
          category: "msg"
        },
        isProcessed: false,
        type: NotificationType.AppNotification,
        createdAt: new Date()
      }
    })
    
    console.log("\n✅ Notification created:")
    console.log(`   ID: ${notification.id}`)
    console.log(`   Message: ${notification.message}`)
    
    console.log("\n⏰ Waiting for NotificationMatcherService to process...")
    console.log("   Expected result: Transaction status should change to READY")
    
    // 3. Check after a few seconds
    setTimeout(async () => {
      const updatedTransaction = await db.transaction.findUnique({
        where: { id: transaction.id }
      })
      
      console.log(`\n📊 Transaction status after 5 seconds: ${updatedTransaction?.status}`)
      
      if (updatedTransaction?.status === "READY") {
        console.log("✅ SUCCESS! Transaction matched and marked as READY")
      } else {
        console.log("❌ Transaction not matched yet")
        console.log("   Check service logs for errors")
      }
      
      await db.$disconnect()
    }, 5000)
    
  } catch (error) {
    console.error("❌ Error:", error)
    await db.$disconnect()
  }
}

sendMatchingNotification()