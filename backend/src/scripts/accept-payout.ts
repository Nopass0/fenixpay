import { db } from "../db";
import { payoutAccountingService } from "../services/payout-accounting.service";

async function acceptPayout() {
  // Find the unassigned payout
  const payout = await db.payout.findFirst({
    where: {
      status: "CREATED",
      traderId: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!payout) {
    console.log("No unassigned payouts found");
    process.exit(0);
  }

  // Find the trader
  const trader = await db.user.findFirst({
    where: {
      email: "trader@test.com",
    },
  });

  if (!trader) {
    console.log("Trader not found");
    process.exit(1);
  }

  console.log("=== Accepting Payout ===");
  console.log(`Payout: ${payout.numericId} (${payout.amount} RUB)`);
  console.log(`Trader: ${trader.email}`);
  console.log(`Trader RUB balance before: ${trader.balanceRub}`);
  console.log(`Trader frozen RUB before: ${trader.frozenRub}`);

  try {
    // Accept the payout
    const acceptedPayout = await payoutAccountingService.acceptPayoutWithAccounting(
      payout.id,
      trader.id
    );

    console.log("\n✓ Payout accepted successfully!");
    console.log(`Status: ${acceptedPayout.status}`);
    console.log(`Accepted at: ${acceptedPayout.acceptedAt}`);
    console.log(`Sum to write off USDT: ${acceptedPayout.sumToWriteOffUSDT}`);

    // Check updated balances
    const updatedTrader = await db.user.findUnique({
      where: { id: trader.id },
    });

    console.log("\nTrader balances after:");
    console.log(`- RUB: ${updatedTrader?.balanceRub} (was ${trader.balanceRub})`);
    console.log(`- Frozen RUB: ${updatedTrader?.frozenRub} (was ${trader.frozenRub})`);
    console.log(`- USDT: ${updatedTrader?.balanceUsdt} (unchanged)`);

  } catch (error) {
    console.error("\n✗ Failed to accept payout:", error);
  }

  process.exit(0);
}

acceptPayout().catch(console.error);