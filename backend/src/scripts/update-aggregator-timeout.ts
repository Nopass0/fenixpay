import { db } from "@/db";

async function updateAggregatorTimeout() {
  try {
    // Get all active aggregators
    const aggregators = await db.aggregator.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        maxSlaMs: true
      }
    });

    console.log("Current aggregator timeout settings:");
    for (const agg of aggregators) {
      console.log(`- ${agg.name}: ${agg.maxSlaMs}ms (${(agg.maxSlaMs / 1000).toFixed(1)}s)`);
    }

    // Update aggregators with 2000ms timeout to 4000ms
    const updateResult = await db.aggregator.updateMany({
      where: {
        maxSlaMs: 2000
      },
      data: {
        maxSlaMs: 4000
      }
    });

    console.log(`\nUpdated ${updateResult.count} aggregator(s) from 2000ms to 4000ms timeout`);

    // Show updated settings
    const updatedAggregators = await db.aggregator.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        maxSlaMs: true
      }
    });

    console.log("\nUpdated aggregator timeout settings:");
    for (const agg of updatedAggregators) {
      console.log(`- ${agg.name}: ${agg.maxSlaMs}ms (${(agg.maxSlaMs / 1000).toFixed(1)}s)`);
    }

  } catch (error) {
    console.error("Error updating aggregator timeouts:", error);
  } finally {
    await db.$disconnect();
  }
}

updateAggregatorTimeout();