import { db } from "../db";
import { MethodType } from "@prisma/client";

async function setupTestData() {
  // Create test merchant if not exists
  let merchant = await db.merchant.findFirst({
    where: { name: "Test Merchant" }
  });

  if (!merchant) {
    merchant = await db.merchant.create({
      data: {
        name: "Test Merchant",
        token: `test-merchant-${Date.now()}`,
        callbackUri: "https://webhook.site/test-callback",
        balanceUsdt: 1000000,
        disabled: false
      }
    });
    console.log("✅ Created test merchant");
  } else {
    console.log("✅ Test merchant already exists");
  }

  // Create c2c method if not exists
  let method = await db.method.findFirst({
    where: { code: "c2c" }
  });

  if (!method) {
    method = await db.method.create({
      data: {
        code: "c2c",
        name: "Card to Card",
        type: MethodType.c2c,
        isEnabled: true,
        commissionPayin: 0,
        commissionPayout: 0,
        maxPayin: 1000000,
        minPayin: 100,
        maxPayout: 1000000,
        minPayout: 100,
        chancePayin: 100,
        chancePayout: 100
      }
    });
    console.log("✅ Created c2c method");
  } else {
    console.log("✅ c2c method already exists");
  }
}

setupTestData()
  .then(() => {
    console.log("\n✅ Test data setup completed!");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
  });