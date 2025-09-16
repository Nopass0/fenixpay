import { db } from "../src/db"
import { DeviceApiClient } from "../src/utils/device-api-client"

async function sendTestNotifications() {
  try {
    console.log("📬 Sending test notifications manually...\n")
    
    // Find the device
    const device = await db.device.findFirst({
      where: { isOnline: true },
      include: { 
        user: true,
        bankDetails: true
      }
    })
    
    if (!device) {
      console.log("❌ No online device found")
      return
    }
    
    console.log(`✅ Found device: ${device.name} (${device.user.email})`)
    console.log(`   Token: ${device.token.substring(0, 20)}...`)
    console.log(`   Bank details: ${device.bankDetails.length}`)
    
    // Find active transactions for realistic amounts
    const transactions = await db.transaction.findMany({
      where: {
        status: { in: ["CREATED", "IN_PROGRESS"] },
        bankDetailId: device.bankDetails[0]?.id
      },
      take: 5
    })
    
    console.log(`\n💰 Found ${transactions.length} active transactions`)
    
    // Create API client
    const apiClient = new DeviceApiClient("http://localhost:3000")
    
    // Set the auth token (simulate authenticated device)
    const authToken = device.token // In real scenario, this would be the JWT from /api/device/connect
    ;(apiClient as any).authToken = authToken
    
    // Generate and send notifications
    const amounts = transactions.length > 0 
      ? transactions.map(t => t.amount)
      : [1000, 2500, 5000, 10000, 15000]
    
    console.log("\n📤 Sending notifications...")
    
    for (let i = 0; i < Math.min(5, amounts.length); i++) {
      const amount = amounts[i]
      const senderNames = ["Иван К.", "Мария П.", "Алексей С.", "Елена В.", "Дмитрий Р."]
      const sender = senderNames[i % senderNames.length]
      const balance = amount * Math.floor(Math.random() * 5 + 2)
      
      const notification = {
        packageName: "ru.sberbank.android",
        appName: "СберБанк Онлайн",
        title: "Пополнение",
        content: `Пополнение на ${amount.toLocaleString('ru-RU')} ₽ от ${sender} Баланс: ${balance.toLocaleString('ru-RU')} ₽`,
        message: `Пополнение на ${amount.toLocaleString('ru-RU')} ₽ от ${sender} Баланс: ${balance.toLocaleString('ru-RU')} ₽`,
        timestamp: Date.now(),
        priority: 1,
        category: "msg"
      }
      
      try {
        // Direct API call
        const response = await fetch("http://localhost:3000/api/device/notification", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(notification)
        })
        
        if (response.ok) {
          console.log(`   ✅ Sent: ${amount} ₽ from ${sender}`)
        } else {
          const error = await response.text()
          console.log(`   ❌ Failed (${response.status}): ${error}`)
        }
        
        // Small delay between notifications
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.log(`   ❌ Error sending notification: ${error.message}`)
      }
    }
    
    // Check if notifications were created
    console.log("\n📊 Checking created notifications...")
    const recentNotifications = await db.notification.findMany({
      where: {
        deviceId: device.id,
        createdAt: {
          gte: new Date(Date.now() - 60000) // Last minute
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`✅ Found ${recentNotifications.length} notifications in the last minute`)
    
    if (recentNotifications.length > 0) {
      console.log("\n🎯 Recent notifications:")
      recentNotifications.slice(0, 3).forEach((notif, i) => {
        console.log(`   ${i + 1}. ${notif.message?.substring(0, 60)}...`)
      })
    }
    
    console.log("\n✅ Test complete!")
    console.log("   Check the notification matching service logs to see if matches were found")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

sendTestNotifications()