import { db } from "@/db";

async function checkDepositSettings() {
  console.log("=== Checking Deposit Settings ===");

  const settings = [
    "deposit_wallet_address",
    "min_deposit_amount",
    "deposit_confirmations_required",
    "deposit_expiry_minutes"
  ];

  for (const key of settings) {
    const config = await db.systemConfig.findUnique({
      where: { key }
    });

    if (config) {
      console.log(`✓ ${key}: ${config.value}`);
    } else {
      console.log(`✗ ${key}: NOT FOUND`);
    }
  }

  // Create missing settings
  console.log("\n=== Creating Missing Settings ===");
  
  const defaultSettings = [
    { key: "deposit_wallet_address", value: "TBPx1234567890abcdefghijklmnopqrst" },
    { key: "min_deposit_amount", value: "10" },
    { key: "deposit_confirmations_required", value: "3" },
    { key: "deposit_expiry_minutes", value: "60" }
  ];

  for (const setting of defaultSettings) {
    const exists = await db.systemConfig.findUnique({
      where: { key: setting.key }
    });

    if (!exists) {
      await db.systemConfig.create({
        data: setting
      });
      console.log(`Created ${setting.key} with value: ${setting.value}`);
    }
  }

  console.log("\nDone!");
}

checkDepositSettings()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());