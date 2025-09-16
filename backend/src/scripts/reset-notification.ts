import { db } from "../db";

async function resetNotification() {
  await db.notification.updateMany({
    where: {
      message: "Зачисление 5000 ₽ на счет *5678"
    },
    data: {
      isRead: false
    }
  });
  
  console.log("✅ Reset notification to unread");
}

resetNotification()
  .then(() => process.exit(0))
  .catch(console.error);