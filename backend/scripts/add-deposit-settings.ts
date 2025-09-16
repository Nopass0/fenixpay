import { db } from "../src/db";

async function addDepositSettings() {
  try {
    // Add deposit wallet address setting
    await db.systemConfig.upsert({
      where: { key: "deposit_wallet_address" },
      create: {
        key: "deposit_wallet_address",
        value: "TBPx1234567890abcdefghijklmnopqrst" // Example USDT TRC20 address
      },
      update: {
        value: "TBPx1234567890abcdefghijklmnopqrst"
      }
    });

    // Add minimum deposit amount
    await db.systemConfig.upsert({
      where: { key: "min_deposit_amount" },
      create: {
        key: "min_deposit_amount",
        value: "10" // Minimum 10 USDT
      },
      update: {
        value: "10"
      }
    });

    // Add deposit confirmations required
    await db.systemConfig.upsert({
      where: { key: "deposit_confirmations_required" },
      create: {
        key: "deposit_confirmations_required",
        value: "3" // 3 confirmations required
      },
      update: {
        value: "3"
      }
    });

    // Add deposit expiry time
    await db.systemConfig.upsert({
      where: { key: "deposit_expiry_minutes" },
      create: {
        key: "deposit_expiry_minutes",
        value: "60" // 60 minutes expiry
      },
      update: {
        value: "60"
      }
    });

    console.log("✅ Deposit settings added successfully");
  } catch (error) {
    console.error("❌ Error adding deposit settings:", error);
  } finally {
    await db.$disconnect();
  }
}

addDepositSettings();