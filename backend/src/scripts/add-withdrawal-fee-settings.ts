import { db } from "../db";

async function addWithdrawalFeeSettings() {
  try {
    console.log("Adding withdrawal fee enabled setting...");

    await db.systemConfig.upsert({
      where: { key: "withdrawal_fee_enabled" },
      create: { key: "withdrawal_fee_enabled", value: "true" },
      update: { value: "true" }
    });

    console.log("✓ withdrawal_fee_enabled: true");
    console.log("\nWithdrawal fee settings added successfully!");
  } catch (error) {
    console.error("Error adding withdrawal fee settings:", error);
  } finally {
    await db.$disconnect();
  }
}

addWithdrawalFeeSettings();