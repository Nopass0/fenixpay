import { db } from "../db";

// Map old statuses to new ones
const statusMap: Record<string, string> = {
  "AVAILABLE": "PROCESSING",
  "PROCESSING": "PROCESSING", 
  "SUCCESS": "COMPLETED",
  "FAILED": "CANCELLED",
  "DISPUTE": "DISPUTED"
};

async function main() {
  console.log("Updating payout statuses to match new schema...");
  
  // First, let's check what statuses exist
  const existingStatuses = await db.$queryRaw<Array<{status: string, count: bigint}>>`
    SELECT status, COUNT(*) as count 
    FROM "Payout" 
    GROUP BY status
  `;
  
  console.log("Current status distribution:", existingStatuses);
  
  // Update statuses to match new schema
  for (const [oldStatus, newStatus] of Object.entries(statusMap)) {
    try {
      const result = await db.$executeRaw`
        UPDATE "Payout" 
        SET status = ${newStatus}::"PayoutStatus"
        WHERE status = ${oldStatus}::"PayoutStatus"
      `;
      
      console.log(`Updated ${result} payouts from ${oldStatus} to ${newStatus}`);
    } catch (error) {
      console.log(`No payouts with status ${oldStatus} to update`);
    }
  }
  
  // Check final status distribution
  const finalStatuses = await db.$queryRaw<Array<{status: string, count: bigint}>>`
    SELECT status, COUNT(*) as count 
    FROM "Payout" 
    GROUP BY status
  `;
  
  console.log("Final status distribution:", finalStatuses);
  
  console.log("\nStatus mapping for reference:");
  console.log("- CREATED -> CREATED (no change)");
  console.log("- AVAILABLE -> PROCESSING");
  console.log("- PROCESSING -> PROCESSING (no change)");
  console.log("- CHECKING -> CHECKING (no change)");
  console.log("- SUCCESS -> COMPLETED");
  console.log("- FAILED -> CANCELLED");
  console.log("- EXPIRED -> EXPIRED (no change)");
  console.log("- CANCELLED -> CANCELLED (no change)");
  console.log("- DISPUTE -> DISPUTED");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());