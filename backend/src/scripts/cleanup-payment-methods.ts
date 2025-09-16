import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupPaymentMethods() {
  console.log("Starting cleanup of payment methods...");

  try {
    // Find all methods that are NOT c2c or sbp
    const methodsToDelete = await prisma.method.findMany({
      where: {
        type: {
          notIn: ["c2c", "sbp"]
        }
      }
    });

    console.log(`Found ${methodsToDelete.length} methods to delete:`, methodsToDelete.map(m => `${m.name} (${m.type})`));

    // Delete all transactions associated with these methods
    const transactionDeleteResult = await prisma.transaction.deleteMany({
      where: {
        methodId: {
          in: methodsToDelete.map(m => m.id)
        }
      }
    });
    console.log(`Deleted ${transactionDeleteResult.count} transactions`);

    // Delete all bank details (requisites) associated with these method types
    const bankDetailDeleteResult = await prisma.bankDetail.deleteMany({
      where: {
        methodType: {
          notIn: ["c2c", "sbp"]
        }
      }
    });
    console.log(`Deleted ${bankDetailDeleteResult.count} bank details`);

    // Delete all merchant method associations
    const merchantMethodDeleteResult = await prisma.merchantMethod.deleteMany({
      where: {
        methodId: {
          in: methodsToDelete.map(m => m.id)
        }
      }
    });
    console.log(`Deleted ${merchantMethodDeleteResult.count} merchant method associations`);

    // Delete all trader merchant associations for these methods
    const traderMerchantDeleteResult = await prisma.traderMerchant.deleteMany({
      where: {
        methodId: {
          in: methodsToDelete.map(m => m.id)
        }
      }
    });
    console.log(`Deleted ${traderMerchantDeleteResult.count} trader merchant associations`);

    // Finally, delete the methods themselves
    const methodDeleteResult = await prisma.method.deleteMany({
      where: {
        type: {
          notIn: ["c2c", "sbp"]
        }
      }
    });
    console.log(`Deleted ${methodDeleteResult.count} methods`);

    // List remaining methods
    const remainingMethods = await prisma.method.findMany();
    console.log("\nRemaining methods:");
    remainingMethods.forEach(m => {
      console.log(`- ${m.name} (${m.type})`);
    });

    console.log("\nCleanup completed successfully!");
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupPaymentMethods();