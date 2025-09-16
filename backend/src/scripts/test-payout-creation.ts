import { db } from "../db";
import { PayoutService } from "../services/payout.service";

async function testPayoutCreation() {
  console.log("=== Testing Payout Creation and Distribution ===\n");

  // Find a test trader
  const trader = await db.user.findFirst({
    where: {
      email: "trader@test.com",
    },
  });

  if (!trader) {
    console.log("Test trader not found!");
    process.exit(1);
  }

  console.log(`Found trader: ${trader.email}`);
  console.log(`Current balances: RUB ${trader.balanceRub}, USDT ${trader.balanceUsdt}`);

  // Add RUB balance to trader
  console.log("\nAdding 50,000 RUB to trader balance...");
  await db.user.update({
    where: { id: trader.id },
    data: {
      balanceRub: 50000,
    },
  });

  // Find a test merchant
  const merchant = await db.merchant.findFirst({
    where: {
      name: "test",
    },
  });

  if (!merchant) {
    console.log("Test merchant not found!");
    process.exit(1);
  }

  console.log(`\nFound merchant: ${merchant.name}`);

  // Create a test payout
  const payoutService = PayoutService.getInstance();
  
  try {
    console.log("\nCreating test payout...");
    const payout = await payoutService.createPayout({
      merchantId: merchant.id,
      amount: 10000, // 10,000 RUB
      wallet: "4444555566667777",
      bank: "Sberbank",
      isCard: true,
      merchantRate: 95, // 1 USDT = 95 RUB
      direction: "OUT",
      rateDelta: 0,
      feePercent: 2, // 2% fee
      externalReference: "TEST_PAYOUT_" + Date.now(),
      processingTime: 30,
    });

    console.log("\nPayout created successfully!");
    console.log(`- ID: ${payout.id}`);
    console.log(`- Numeric ID: ${payout.numericId}`);
    console.log(`- Amount: ${payout.amount} RUB`);
    console.log(`- Total: ${payout.total} RUB (with fee)`);
    console.log(`- Total USDT: ${payout.totalUsdt}`);
    console.log(`- Status: ${payout.status}`);
    console.log(`- Assigned to trader: ${payout.traderId || "Not assigned yet"}`);

    // Wait a bit for the monitor service to pick it up
    console.log("\nWaiting 3 seconds for monitor service to process...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if payout was assigned
    const updatedPayout = await db.payout.findUnique({
      where: { id: payout.id },
      include: { trader: true },
    });

    if (updatedPayout?.traderId) {
      console.log(`\n✓ Payout was assigned to trader: ${updatedPayout.trader?.email}`);
    } else {
      console.log("\n✗ Payout was not assigned automatically");
      console.log("This might be because:");
      console.log("- PayoutMonitorService is not running");
      console.log("- Trader doesn't meet eligibility criteria");
      console.log("- There's an issue with the distribution logic");
    }

    // Check updated trader balance
    const updatedTrader = await db.user.findUnique({
      where: { id: trader.id },
    });
    console.log(`\nTrader balances after:`);
    console.log(`- RUB: ${updatedTrader?.balanceRub}`);
    console.log(`- Frozen RUB: ${updatedTrader?.frozenRub}`);
    console.log(`- USDT: ${updatedTrader?.balanceUsdt}`);

  } catch (error) {
    console.error("Error creating payout:", error);
  }

  process.exit(0);
}

testPayoutCreation().catch(console.error);