import { db } from "../db";

async function main() {
  console.log("Checking PayoutStatus enum values...");
  
  try {
    // Try to query with ACTIVE status
    const activeCount = await db.payout.count({
      where: { status: "ACTIVE" as any }
    });
    console.log("ACTIVE status query successful, count:", activeCount);
  } catch (error: any) {
    console.error("ACTIVE status query failed:", error.message);
  }
  
  // Check what statuses exist in the database
  const statuses = await db.$queryRaw<Array<{status: string}>>`
    SELECT DISTINCT status FROM "Payout"
  `;
  
  console.log("Existing statuses in database:", statuses);
  
  // Check enum values directly
  try {
    const enumValues = await db.$queryRaw<Array<{enumlabel: string}>>`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type 
        WHERE typname = 'PayoutStatus'
      )
      ORDER BY enumsortorder
    `;
    console.log("PayoutStatus enum values in database:", enumValues);
  } catch (error: any) {
    console.error("Failed to check enum values:", error.message);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());