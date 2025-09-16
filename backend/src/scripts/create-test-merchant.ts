import { db } from "../db";
import { randomBytes } from "crypto";

async function createTestMerchant() {
  try {
    // Check if test merchant already exists
    const existingMerchant = await db.merchant.findFirst({
      where: { name: "test" }
    });

    if (existingMerchant) {
      console.log("Test merchant already exists:", existingMerchant.id);
      return;
    }

    // Create test merchant
    const token = randomBytes(32).toString("hex");
    const merchant = await db.merchant.create({
      data: {
        name: "test",
        token: token,
        balanceUsdt: 10000, // Start with some balance for testing
        lastPayin: new Date(),
        lastPayout: new Date(),
      }
    });

    console.log("Test merchant created successfully!");
    console.log("ID:", merchant.id);
    console.log("Token:", merchant.token);
    console.log("Balance:", merchant.balanceUsdt, "USDT");

  } catch (error) {
    console.error("Error creating test merchant:", error);
  } finally {
    await db.$disconnect();
  }
}

createTestMerchant();