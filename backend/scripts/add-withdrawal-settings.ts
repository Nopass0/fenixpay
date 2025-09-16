import { db } from "../src/db";

async function addWithdrawalSettings() {
  try {
    console.log("Adding withdrawal settings to system config...");

    const settings = [
      { key: "min_withdrawal_amount", value: "50" },
      { key: "withdrawal_fee_percent", value: "2" },
      { key: "withdrawal_fee_fixed", value: "5" },
      { key: "withdrawal_processing_time_hours", value: "24" },
      { key: "withdrawal_auto_approve_threshold", value: "100" },
      { key: "withdrawal_manual_review_threshold", value: "1000" },
      { key: "withdrawal_webhook_url", value: "" },
      { key: "withdrawal_webhook_secret", value: "" },
    ];

    for (const setting of settings) {
      await db.systemConfig.upsert({
        where: { key: setting.key },
        create: setting,
        update: { value: setting.value }
      });
      console.log(`✓ ${setting.key}: ${setting.value}`);
    }

    console.log("\nWithdrawal settings added successfully!");
  } catch (error) {
    console.error("Error adding withdrawal settings:", error);
  } finally {
    await db.$disconnect();
  }
}

addWithdrawalSettings();