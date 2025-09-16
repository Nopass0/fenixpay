import { db } from "../src/db"

async function checkDeviceNotifications() {
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
    
    console.log(`📱 Device: ${device.name}`)
    console.log(`   Status: ${device.isOnline ? '🟢 Online' : '🔴 Offline'}`)
    console.log(`   Token: ${device.token}`)
    
    // Get recent notifications for this device
    const notifications = await db.notification.findMany({
      where: {
        deviceId: device.id,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    console.log(`\n📬 Notifications (last 10 minutes): ${notifications.length}\n`)
    
    if (notifications.length > 0) {
      notifications.forEach(notif => {
        console.log(`[${notif.createdAt.toLocaleTimeString()}] ${notif.type}`)
        console.log(`  App: ${notif.application || 'N/A'}`)
        console.log(`  Title: ${notif.title || 'N/A'}`)
        console.log(`  Message: ${notif.message}`)
        console.log(`  Processed: ${notif.isProcessed ? '✅' : '❌'}`)
        console.log("")
      })
    } else {
      console.log("No notifications found")
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

checkDeviceNotifications()