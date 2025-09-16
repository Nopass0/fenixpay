import { db } from "../src/db"
import { Status } from "@prisma/client"

async function reprocessNotification() {
  try {
    console.log("🔄 Reprocessing notification...\n")
    
    // Find the notification that should have matched
    const notification = await db.notification.findFirst({
      where: {
        message: { contains: "₽" },
        isProcessed: true
      },
      include: {
        Device: {
          include: {
            bankDetails: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!notification) {
      console.log("❌ No notification found")
      return
    }
    
    console.log("📬 Found notification:")
    console.log(`   Message: ${notification.message}`)
    console.log(`   Device: ${notification.Device?.name}`)
    
    // Mark as unprocessed to reprocess
    await db.notification.update({
      where: { id: notification.id },
      data: { 
        isProcessed: false,
        metadata: {
          ...notification.metadata as any,
          packageName: "ru.sberbank.android" // Make sure package name is set
        }
      }
    })
    
    console.log("✅ Marked notification for reprocessing")
    
    // Also update the transaction status back to CREATED if it's IN_PROGRESS
    const transaction = await db.transaction.findFirst({
      where: {
        amount: 27308,
        status: "IN_PROGRESS"
      }
    })
    
    if (transaction) {
      await db.transaction.update({
        where: { id: transaction.id },
        data: { status: "CREATED" }
      })
      console.log("✅ Reset transaction status to CREATED")
    }
    
    console.log("\n⏰ The NotificationMatcherService will reprocess this notification in the next cycle")
    console.log("   Watch the logs for '[NotificationMatcherService]' messages")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

reprocessNotification()