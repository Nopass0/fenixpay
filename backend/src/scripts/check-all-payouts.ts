#!/usr/bin/env bun

import { db } from "../db";

async function checkAllPayouts() {
  try {
    // Check all non-completed payouts
    const payouts = await db.payout.findMany({
      where: {
        status: {
          notIn: ["COMPLETED", "CANCELLED", "EXPIRED"]
        }
      },
      include: {
        trader: true,
        merchant: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${payouts.length} active/pending payouts:\n`);
    
    for (const payout of payouts) {
      console.log(`Payout #${payout.numericId}:`);
      console.log(`  Status: ${payout.status}`);
      console.log(`  Amount: ${payout.amount} RUB (Total: ${payout.total} RUB)`);
      console.log(`  Merchant: ${payout.merchant.name}`);
      console.log(`  Trader: ${payout.trader ? `#${payout.trader.numericId} (${payout.trader.email})` : 'Not assigned'}`);
      console.log(`  Created: ${payout.createdAt.toLocaleString()}`);
      console.log(`  Expires: ${payout.expireAt.toLocaleString()}`);
      console.log(`---`);
    }

    // Check trader balances
    const trader = await db.user.findFirst({
      where: { email: "payout-trader@test.com" }
    });

    if (trader) {
      console.log(`\nTrader payout-trader@test.com balance breakdown:`);
      console.log(`  Total Payout Balance: ${trader.payoutBalance} RUB`);
      console.log(`  Frozen Balance: ${trader.frozenPayoutBalance} RUB`);
      console.log(`  Available Balance: ${trader.payoutBalance - trader.frozenPayoutBalance} RUB`);
    }

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkAllPayouts();