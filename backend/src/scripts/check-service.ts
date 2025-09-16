import { db } from "../db";

async function checkService() {
  const service = await db.service.findUnique({
    where: { name: "NotificationMatcherService" }
  });
  
  if (service) {
    console.log(`NotificationMatcherService enabled: ${service.enabled}`);
    
    if (!service.enabled) {
      await db.service.update({
        where: { name: "NotificationMatcherService" },
        data: { enabled: true }
      });
      console.log("✅ Enabled NotificationMatcherService");
    }
  } else {
    await db.service.create({
      data: {
        name: "NotificationMatcherService",
        enabled: true
      }
    });
    console.log("✅ Created and enabled NotificationMatcherService");
  }
}

checkService()
  .then(() => process.exit(0))
  .catch(console.error);