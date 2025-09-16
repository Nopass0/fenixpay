#!/usr/bin/env bun

import { db } from "../db";

async function cleanupOldPayouts() {
  try {
    // Find old payouts in CHECKING status that have expired
    const expiredCheckingPayouts = await db.payout.findMany({
      where: {
        status: "CHECKING",
        expireAt: {
          lt: new Date() // Already expired
        }
      }
    });

    console.log(`Found ${expiredCheckingPayouts.length} expired CHECKING payouts\n`);

    for (const payout of expiredCheckingPayouts) {
      console.log(`Cancelling expired payout #${payout.numericId}...`);
      
      // Cancel the payout and return frozen balance
      await db.$transaction([
        db.payout.update({
          where: { id: payout.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: "Expired while in checking status"
          }
        }),
        // Return frozen balance to trader if they have one
        ...(payout.traderId ? [
          db.user.update({
            where: { id: payout.traderId },
            data: {
              frozenPayoutBalance: { decrement: payout.total },
              payoutBalance: { increment: payout.total }
            }
          })
        ] : [])
      ]);
      
      console.log(`✅ Cancelled payout #${payout.numericId}, returned ${payout.total} RUB to trader`);
    }

    // Check updated balance
    const trader = await db.user.findFirst({
      where: { email: "payout-trader@test.com" }
    });

    if (trader) {
      console.log(`\nUpdated trader balance:`);
      console.log(`  Total Payout Balance: ${trader.payoutBalance} RUB`);
      console.log(`  Frozen Balance: ${trader.frozenPayoutBalance} RUB`);
      console.log(`  Available Balance: ${trader.payoutBalance - trader.frozenPayoutBalance} RUB`);
    }

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

cleanupOldPayouts();