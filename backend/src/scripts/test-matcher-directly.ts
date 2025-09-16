import { NotificationMatcherService } from "../services/NotificationMatcherService";
import { db } from "../db";

async function testMatcher() {
  console.log("🚀 Testing NotificationMatcherService directly...\n");
  
  // Get unread notifications
  const notifications = await db.notification.findMany({
    where: {
      isRead: false,
      type: "AppNotification"
    },
    include: {
      Device: {
        include: {
          bankDetails: true
        }
      }
    }
  });
  
  console.log(`Found ${notifications.length} unread notifications`);
  
  // Create service instance
  const service = new NotificationMatcherService();
  
  // Process each notification
  for (const notif of notifications) {
    console.log(`\nProcessing notification: ${notif.message}`);
    console.log(`Device: ${notif.Device?.id || 'No device'}`);
    console.log(`Package: ${notif.packageName}`);
    
    // Call the service's processNotification method directly
    try {
      await (service as any).processNotification(notif);
    } catch (error) {
      console.error("Error processing:", error);
    }
  }
  
  // Check transactions again
  console.log("\n🔍 Checking transaction statuses...");
  const transactions = await db.transaction.findMany({
    where: {
      orderId: { startsWith: "TEST-" }
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  
  for (const tx of transactions) {
    console.log(`Transaction ${tx.amount} RUB: ${tx.status}`);
  }
}

testMatcher()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
  });