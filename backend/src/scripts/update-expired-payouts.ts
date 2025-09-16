import { db } from "../db";

async function updateExpiredPayouts() {
  try {
    const now = new Date();
    
    // Update all payouts that should be expired
    const result = await db.payout.updateMany({
      where: {
        status: "CREATED",
        expireAt: {
          lt: now
        }
      },
      data: {
        status: "EXPIRED"
      }
    });
    
    console.log(`Updated ${result.count} expired payouts`);
    
    // Also log some stats
    const expiredCount = await db.payout.count({
      where: { status: "EXPIRED" }
    });
    
    const activeCount = await db.payout.count({
      where: { status: "ACTIVE" }
    });
    
    console.log(`Total expired payouts: ${expiredCount}`);
    console.log(`Total active payouts: ${activeCount}`);
    
  } catch (error) {
    console.error("Error updating expired payouts:", error);
  } finally {
    await db.$disconnect();
  }
}

updateExpiredPayouts();