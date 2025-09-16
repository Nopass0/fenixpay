import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function checkAggregator() {
  const aggregator = await db.aggregator.findFirst({
    where: { isChaseCompatible: true }
  });
  
  console.log("Aggregator settings:");
  console.log("  Name:", aggregator?.name);
  console.log("  maxSlaMs:", aggregator?.maxSlaMs);
  console.log("  apiBaseUrl:", aggregator?.apiBaseUrl);
  console.log("  sbpMethodId:", aggregator?.sbpMethodId);
  console.log("  c2cMethodId:", aggregator?.c2cMethodId);
  
  await db.$disconnect();
}

checkAggregator().catch(console.error);
