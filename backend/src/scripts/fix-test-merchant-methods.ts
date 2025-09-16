import { db } from "../db";

async function fixTestMerchantMethods() {
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

    // Remove existing merchant methods
    await db.merchantMethod.deleteMany({
      where: {
        merchantId: testMerchant.id
      }
    });

    console.log("Deleted existing merchant methods");

    // Add all methods to test merchant
    for (const method of methods) {
      await db.merchantMethod.create({
        data: {
          merchantId: testMerchant.id,
          methodId: method.id,
          isEnabled: true
        }
      });
      console.log(`✅ Added method ${method.name} (${method.code}) with ID ${method.id} to test merchant`);
    }

    console.log("\nTest merchant methods fixed successfully!");

    // Show final state
    const finalMethods = await db.merchantMethod.findMany({
      where: { merchantId: testMerchant.id },
      include: { method: true }
    });

    console.log("\nFinal merchant methods:");
    for (const mm of finalMethods) {
      console.log(`- ${mm.method.name} (${mm.method.code}): ${mm.method.id}, enabled: ${mm.isEnabled}`);
    }

  } catch (error) {
    console.error("Error fixing test merchant methods:", error);
  } finally {
    await db.$disconnect();
  }
}

fixTestMerchantMethods();