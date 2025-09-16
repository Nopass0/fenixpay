import { db } from "../db";

async function checkPayoutStatus() {
  // Find the latest payout
  const payout = await db.payout.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      trader: true,
      merchant: true,
    },
  });

  if (!payout) {
    console.log("No payouts found");
    process.exit(0);
  }

  console.log("=== Latest Payout Status ===");
  console.log(`ID: ${payout.id}`);
  console.log(`Numeric ID: ${payout.numericId}`);
  console.log(`Status: ${payout.status}`);
  console.log(`Amount: ${payout.amount} RUB`);
  console.log(`Total: ${payout.total} RUB`);
  console.log(`Total USDT: ${payout.totalUsdt}`);
  console.log(`Created: ${payout.createdAt}`);
  console.log(`Expires: ${payout.expireAt}`);
  console.log(`Merchant: ${payout.merchant.name}`);
  
  if (payout.trader) {
    console.log(`\nAssigned to trader: ${payout.trader.email}`);
    console.log(`Accepted at: ${payout.acceptedAt || "Not accepted yet"}`);
    console.log(`Sum to write off USDT: ${payout.sumToWriteOffUSDT || "Not set"}`);
    
    // Check trader's current balances
    console.log("\nTrader current balances:");
    console.log(`- RUB: ${payout.trader.balanceRub}`);
    console.log(`- Frozen RUB: ${payout.trader.frozenRub}`);
    console.log(`- USDT: ${payout.trader.balanceUsdt}`);
  } else {
    console.log("\nNot assigned to any trader yet");
  }

  // Check if there are any active payouts
  const activePayouts = await db.payout.count({
    where: { status: "ACTIVE" },
  });
  console.log(`\nTotal active payouts in system: ${activePayouts}`);

  process.exit(0);
}

checkPayoutStatus().catch(console.error);