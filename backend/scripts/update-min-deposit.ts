import { db } from "../src/db";

async function updateMinDeposit() {
  try {
    // Update minimum deposit amount to 1 USDT
    const updated = await db.systemConfig.upsert({
      where: { key: "min_deposit_amount" },
      create: {
        key: "min_deposit_amount",
        value: "1" // Minimum 1 USDT
      },
      update: {
        value: "1" // Minimum 1 USDT
      }
    });

    console.log("✅ Updated minimum deposit amount to 1 USDT");
    console.log("Config:", updated);
  } catch (error) {
    console.error("❌ Error updating min deposit amount:", error);
  } finally {
    await db.$disconnect();
  }
}

updateMinDeposit();