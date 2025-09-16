import { db } from "@/db";

async function setupAggregatorTimeout() {
  try {
    // First, let's check if any aggregators exist
    const aggregators = await db.aggregator.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        maxSlaMs: true,
        isActive: true,
        apiBaseUrl: true
      }
    });

    console.log(`Found ${aggregators.length} aggregator(s):`);

    if (aggregators.length === 0) {
      console.log("\nNo aggregators found. Creating a default aggregator...");

      // Create a default aggregator with 4-second timeout
      const newAggregator = await db.aggregator.create({
        data: {
          email: "default@aggregator.com",
          password: "$2a$10$defaulthash", // This should be properly hashed in production
          name: "Default Aggregator",
          apiToken: `agg_token_${Date.now()}`,
          callbackToken: `callback_token_${Date.now()}`,
          apiBaseUrl: "https://api.aggregator.local",
          maxSlaMs: 4000, // 4 seconds timeout
          isActive: true,
          balanceUsdt: 10000,
          depositUsdt: 1000,
          requiresInsuranceDeposit: false
        }
      });

      console.log(`Created aggregator: ${newAggregator.name} with ${newAggregator.maxSlaMs}ms timeout`);
    } else {
      // Update all aggregators to have at least 4-second timeout
      for (const agg of aggregators) {
        console.log(`- ${agg.name}: ${agg.maxSlaMs}ms timeout, active: ${agg.isActive}, url: ${agg.apiBaseUrl}`);

        if (!agg.maxSlaMs || agg.maxSlaMs < 4000) {
          console.log(`  Updating ${agg.name} timeout from ${agg.maxSlaMs}ms to 4000ms...`);

          await db.aggregator.update({
            where: { id: agg.id },
            data: { maxSlaMs: 4000 }
          });
        }
      }
    }

    // Also check for any aggregator-merchant relationships
    const aggMerchants = await db.aggregatorMerchant.count();
    console.log(`\nFound ${aggMerchants} aggregator-merchant relationship(s)`);

    if (aggMerchants === 0 && aggregators.length > 0) {
      console.log("No aggregator-merchant relationships found.");
      console.log("You may need to configure aggregator-merchant relationships for routing to work.");
    }

  } catch (error) {
    console.error("Error setting up aggregator timeouts:", error);
  } finally {
    await db.$disconnect();
  }
}

setupAggregatorTimeout();