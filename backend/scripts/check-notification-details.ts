import { db } from "../src/db"

async function checkNotificationDetails() {
  try {
    const notifications = await db.notification.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        Device: {
          include: {
            bankDetails: true
          }
        }
      }
    })
    
    console.log(`📬 Recent notifications (${notifications.length}):\n`)
    
    notifications.forEach((notif, i) => {
      console.log(`${i + 1}. ${notif.message}`)
      console.log(`   ID: ${notif.id}`)
      console.log(`   Type: ${notif.type}`)
      console.log(`   Application: ${notif.application}`)
      console.log(`   Metadata: ${JSON.stringify(notif.metadata)}`)
      console.log(`   Device: ${notif.Device?.name || 'None'}`)
      if (notif.Device?.bankDetails.length > 0) {
        console.log(`   Bank Type: ${notif.Device.bankDetails[0].bankType}`)
      }
      console.log(`   Processed: ${notif.isProcessed}`)
      console.log("")
    })
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

checkNotificationDetails()