#!/usr/bin/env bun

import { db } from "../db";
import { PayoutService } from "../services/payout.service";

const payoutService = PayoutService.getInstance();

async function testTraderPayouts() {
  try {
    // Find a trader with active payouts
    const trader = await db.user.findFirst({
      where: { email: "trader@test.com" }
    });
    
    if (!trader) {
      console.log("Trader not found");
      return;
    }
    
    console.log(`Testing payouts for trader: ${trader.email} (ID: ${trader.id})\n`);
    
    // Test different status filters
    const testCases = [
      { name: "All payouts", status: undefined },
      { name: "Active payouts", status: ["ACTIVE"] as any },
      { name: "Active and Created", status: ["ACTIVE", "CREATED"] as any },
      { name: "Created only", status: ["CREATED"] as any },
    ];
    
    for (const testCase of testCases) {
      console.log(`\n--- ${testCase.name} ---`);
      const result = await payoutService.getTraderPayouts(trader.id, {
        status: testCase.status,
        limit: 10
      });
      
      console.log(`Found ${result.payouts.length} payouts:`);
      for (const payout of result.payouts) {
        console.log(`- ID: ${payout.numericId}, Status: ${payout.status}, Trader: ${payout.traderId ? 'Assigned' : 'Pool'}, Amount: ${payout.amount} RUB`);
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testTraderPayouts();