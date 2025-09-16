import { db } from "@/db";

async function setupAggregatorMerchant() {
  try {
    // Get all aggregators
    const aggregators = await db.aggregator.findMany({
      select: { id: true, name: true, isActive: true }
    });

    console.log(`Found ${aggregators.length} aggregator(s)`);

    // Get all merchants
    const merchants = await db.merchant.findMany({
      select: { id: true, name: true }
    });

    console.log(`Found ${merchants.length} merchant(s)`);

    // Get all methods
    const methods = await db.method.findMany({
      select: { id: true, code: true, name: true }
    });

    console.log(`Found ${methods.length} method(s)`);

    if (aggregators.length === 0 || merchants.length === 0 || methods.length === 0) {
      console.log("\nCannot create aggregator-merchant relationships:");
      if (aggregators.length === 0) console.log("- No aggregators found");
      if (merchants.length === 0) console.log("- No merchants found");
      if (methods.length === 0) console.log("- No methods found");
      return;
    }

    // Check existing relationships
    const existingRelations = await db.aggregatorMerchant.count();
    console.log(`\nExisting aggregator-merchant relationships: ${existingRelations}`);

    if (existingRelations === 0) {
      console.log("\nCreating aggregator-merchant relationships...");

      // Create relationships for each aggregator-merchant-method combination
      let created = 0;
      for (const aggregator of aggregators) {
        for (const merchant of merchants) {
          for (const method of methods) {
            try {
              await db.aggregatorMerchant.create({
                data: {
                  aggregatorId: aggregator.id,
                  merchantId: merchant.id,
                  methodId: method.id,
                  feeIn: 2.0,  // 2% fee on incoming
                  feeOut: 1.5, // 1.5% fee on outgoing
                  isFeeInEnabled: true,
                  isFeeOutEnabled: true,
                  isTrafficEnabled: true,
                  useFlexibleRates: false
                }
              });
              created++;
              console.log(`  Created relationship: ${aggregator.name} <-> ${merchant.name} (${method.code})`);
            } catch (error: any) {
              if (error.code === 'P2002') {
                // Unique constraint violation - relationship already exists
                console.log(`  Relationship already exists: ${aggregator.name} <-> ${merchant.name} (${method.code})`);
              } else {
                console.error(`  Error creating relationship: ${error.message}`);
              }
            }
          }
        }
      }

      console.log(`\nCreated ${created} new aggregator-merchant relationships`);
    } else {
      console.log("Aggregator-merchant relationships already exist");
    }

    // Show summary
    const finalCount = await db.aggregatorMerchant.count();
    console.log(`\nTotal aggregator-merchant relationships: ${finalCount}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

setupAggregatorMerchant();