#!/usr/bin/env bun

import { db } from "../db";

async function checkTraderPayoutBalance() {
  try {
    // Find trader
    const trader = await db.user.findFirst({
      where: { 
        email: "payout-trader@test.com"
      }
    });

    if (!trader) {
      console.error("Trader not found");
      process.exit(1);
    }

    console.log(`Trader ${trader.email} (ID: ${trader.numericId}):`);
    console.log(`  Payout Balance: ${trader.payoutBalance} RUB`);
    console.log(`  Frozen Payout Balance: ${trader.frozenPayoutBalance} RUB`);
    console.log(`  Balance USDT: ${trader.balanceUsdt} USDT`);
    console.log(`  Max Simultaneous Payouts: ${trader.maxSimultaneousPayouts}`);
    console.log(`  Traffic Enabled: ${trader.trafficEnabled}`);
    console.log(`  Banned: ${trader.banned}`);

    // Check current payouts
    const activePayouts = await db.payout.count({
      where: {
        traderId: trader.id,
        status: "ACTIVE"
      }
    });

    const createdPayouts = await db.payout.count({
      where: {
        traderId: trader.id,
        status: "CREATED"
      }
    });

    console.log(`\nCurrent payouts:`);
    console.log(`  Active: ${activePayouts}`);
    console.log(`  Created: ${createdPayouts}`);
    console.log(`  Total: ${activePayouts + createdPayouts}`);

    // Check global limits
    const settings = await db.serviceConfig.findUnique({
      where: { serviceKey: "payout_limits" }
    });

    const limits = {
      maxActivePayouts: 10,
      maxCreatedPayouts: 20,
      maxTotalPayouts: 25,
      ...(settings?.config || {}),
    };

    console.log(`\nGlobal limits:`);
    console.log(`  Max Active: ${limits.maxActivePayouts}`);
    console.log(`  Max Created: ${limits.maxCreatedPayouts}`);
    console.log(`  Max Total: ${limits.maxTotalPayouts}`);

    // Check available payouts
    const availablePayouts = await db.payout.findMany({
      where: {
        status: "CREATED",
        traderId: null,
        expireAt: { gt: new Date() }
      },
      select: {
        id: true,
        numericId: true,
        amount: true,
        total: true,
        status: true
      }
    });

    console.log(`\nAvailable payouts to accept: ${availablePayouts.length}`);
    availablePayouts.forEach(p => {
      console.log(`  #${p.numericId}: ${p.total} RUB (needs ${p.total} RUB balance)`);
    });

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTraderPayoutBalance();