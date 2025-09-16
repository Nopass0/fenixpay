import { db } from "../db";

async function setupTestMerchant() {
  try {
    // Find test merchant
    const testMerchant = await db.merchant.findFirst({
      where: { name: "test" }
    });

    if (!testMerchant) {
      console.error("Test merchant not found!");
      return;
    }

    console.log("Test merchant found:", testMerchant.id);

    // Find all methods
    const methods = await db.method.findMany({
      where: { isEnabled: true }
    });

    console.log(`Found ${methods.length} enabled methods`);

    // Enable all methods for test merchant
    for (const method of methods) {
      const existing = await db.merchantMethod.findUnique({
        where: {
          merchantId_methodId: {
            merchantId: testMerchant.id,
            methodId: method.id
          }
        }
      });

      if (!existing) {
        await db.merchantMethod.create({
          data: {
            merchantId: testMerchant.id,
            methodId: method.id,
            isEnabled: true
          }
        });
        console.log(`✅ Enabled method ${method.name} (${method.code}) for test merchant`);
      } else if (!existing.isEnabled) {
        await db.merchantMethod.update({
          where: {
            merchantId_methodId: {
              merchantId: testMerchant.id,
              methodId: method.id
            }
          },
          data: {
            isEnabled: true
          }
        });
        console.log(`✅ Re-enabled method ${method.name} (${method.code}) for test merchant`);
      } else {
        console.log(`✓ Method ${method.name} (${method.code}) already enabled`);
      }
    }

    console.log("\nTest merchant setup complete!");

  } catch (error) {
    console.error("Error setting up test merchant:", error);
  } finally {
    await db.$disconnect();
  }
}

setupTestMerchant();