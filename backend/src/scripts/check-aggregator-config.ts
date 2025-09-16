import { db } from "@/db";

async function checkAggregatorConfig() {
  try {
    // Get all aggregators
    const aggregators = await db.aggregator.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        apiBaseUrl: true,
        maxSlaMs: true,
        isActive: true,
        isChaseProject: true,
        isChaseCompatible: true,
        apiSchema: true,
        balanceUsdt: true,
        depositUsdt: true,
        merchants: {
          select: {
            merchantId: true,
            methodId: true,
            feeIn: true,
            isTrafficEnabled: true
          }
        }
      }
    });

    console.log("=== AGGREGATOR CONFIGURATION ===\n");

    for (const agg of aggregators) {
      console.log(`Aggregator: ${agg.name}`);
      console.log(`  ID: ${agg.id}`);
      console.log(`  Email: ${agg.email}`);
      console.log(`  API URL: ${agg.apiBaseUrl || 'NOT SET'}`);
      console.log(`  Timeout: ${agg.maxSlaMs}ms`);
      console.log(`  Active: ${agg.isActive}`);
      console.log(`  Chase Project: ${agg.isChaseProject}`);
      console.log(`  Chase Compatible: ${agg.isChaseCompatible}`);
      console.log(`  API Schema: ${agg.apiSchema}`);
      console.log(`  Balance USDT: ${agg.balanceUsdt}`);
      console.log(`  Deposit USDT: ${agg.depositUsdt}`);
      console.log(`  Merchant Relations: ${agg.merchants.length}`);

      if (agg.merchants.length > 0) {
        console.log(`  Merchant Details:`);
        for (const rel of agg.merchants) {
          console.log(`    - Merchant: ${rel.merchantId}, Method: ${rel.methodId}, FeeIn: ${rel.feeIn}%, Enabled: ${rel.isTrafficEnabled}`);
        }
      }

      console.log();
    }

    // Check if Test Aggregator needs URL update
    const testAgg = aggregators.find(a => a.name === 'Test Aggregator');
    if (testAgg && testAgg.apiBaseUrl === 'https://api.aggregator.local') {
      console.log("⚠️  Test Aggregator has invalid URL: https://api.aggregator.local");
      console.log("   This URL doesn't exist and will cause timeouts.");
      console.log("   Updating to use local Chase instance...\n");

      // Update to use local Chase instance as aggregator
      await db.aggregator.update({
        where: { id: testAgg.id },
        data: {
          apiBaseUrl: 'https://chasepay.pro/api',
          isChaseProject: true,
          isChaseCompatible: true
        }
      });

      console.log("✅ Updated Test Aggregator to use Chase API");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

checkAggregatorConfig();