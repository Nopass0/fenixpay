import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function fixTimeout() {
  const aggregator = await db.aggregator.updateMany({
    where: { isChaseCompatible: true },
    data: { maxSlaMs: 30000 }
  });
  
  console.log("Updated", aggregator.count, "aggregator(s) with 30 second timeout");
  
  await db.$disconnect();
}

fixTimeout().catch(console.error);
