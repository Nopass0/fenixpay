#!/usr/bin/env bun

import { db } from "../db";

async function testPayoutMonitor() {
  try {
    // Find test merchant
    const merchant = await db.merchant.findFirst({
      where: { name: "test-payout-merchant" }
    });

    if (!merchant) {
      console.error("Test merchant not found");
      process.exit(1);
    }

    // Create a payout without a trader
    const payout = await db.payout.create({
      data: {
        merchantId: merchant.id,
        amount: 1000,
        amountUsdt: 10.2,
        total: 1000,
        totalUsdt: 10.2,
        rate: 98,
        merchantRate: 98,
        rateDelta: 0,
        feePercent: 0,
        direction: "OUT",
        wallet: "79991234567",
        bank: "SBER",
        isCard: true,
        expireAt: new Date(Date.now() + 15 * 60 * 1000),
        processingTime: 15,
        externalReference: `TEST-MONITOR-${Date.now()}`,
      }
    });

    console.log(`✅ Created test payout without trader:`);
    console.log(`   ID: ${payout.id}`);
    console.log(`   Numeric ID: ${payout.numericId}`);
    console.log(`   Status: ${payout.status}`);
    console.log(`   Trader ID: ${payout.traderId || 'null'}`);

    // Check if payout is unassigned
    const unassignedCount = await db.payout.count({
      where: {
        status: "CREATED",
        traderId: null,
        expireAt: { gt: new Date() }
      }
    });

    console.log(`\n📊 Total unassigned payouts: ${unassignedCount}`);
    console.log("\n⏳ PayoutMonitorService should distribute this payout within 30 seconds...");

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testPayoutMonitor();