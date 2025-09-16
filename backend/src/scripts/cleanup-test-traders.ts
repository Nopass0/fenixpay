#!/usr/bin/env bun
import { db } from "../db";

async function cleanup() {
  console.log("🧹 Cleaning up test traders data...");

  try {
    // Find test trader IDs
    const testTraders = await db.user.findMany({
      where: {
        email: {
          in: ["small-balance@test.com", "large-balance@test.com"]
        }
      },
      select: { id: true }
    });

    const traderIds = testTraders.map(t => t.id);

    if (traderIds.length > 0) {
      console.log(`Found ${traderIds.length} test traders to clean up`);

      // Delete in correct order to avoid foreign key constraints
      await db.message.deleteMany({ where: { traderId: { in: traderIds } } });
      console.log("✅ Deleted messages");

      await db.dealDispute.deleteMany({
        where: {
          transaction: {
            traderId: { in: traderIds }
          }
        }
      });
      console.log("✅ Deleted deal disputes");

      await db.withdrawalDispute.deleteMany({
        where: {
          payout: {
            traderId: { in: traderIds }
          }
        }
      });
      console.log("✅ Deleted withdrawal disputes");

      await db.transaction.deleteMany({ where: { traderId: { in: traderIds } } });
      console.log("✅ Deleted transactions");

      await db.payout.deleteMany({ where: { traderId: { in: traderIds } } });
      console.log("✅ Deleted payouts");

      await db.bankDetail.deleteMany({ where: { userId: { in: traderIds } } });
      console.log("✅ Deleted bank details");

      await db.device.deleteMany({ where: { userId: { in: traderIds } } });
      console.log("✅ Deleted devices");

      await db.folder.deleteMany({ where: { traderId: { in: traderIds } } });
      console.log("✅ Deleted folders");

      await db.traderMerchant.deleteMany({ where: { traderId: { in: traderIds } } });
      console.log("✅ Deleted trader-merchant associations");

      await db.user.deleteMany({
        where: {
          email: {
            in: ["small-balance@test.com", "large-balance@test.com"]
          }
        }
      });
      console.log("✅ Deleted test traders");
    } else {
      console.log("No test traders found to clean up");
    }

    console.log("🎉 Cleanup completed successfully!");

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

cleanup();