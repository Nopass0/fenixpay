import { db } from "../src/db";
import { PayoutService } from "../src/services/payout.service";

async function main() {
  try {
    const payoutService = PayoutService.getInstance();
    
    // Get trader
    const trader = await db.user.findFirst({
      where: { email: "trader@test.com" }
    });
    
    if (!trader) {
      console.error("Trader not found");
      return;
    }
    
    console.log("Testing fee calculation for trader:", trader.email);
    
    // Get payouts
    const result = await payoutService.getTraderPayouts(trader.id, {
      limit: 5
    });
    
    console.log("\nPayouts with fee calculations:");
    result.payouts.forEach((p: any) => {
      console.log(`\nPayout #${p.numericId}:`);
      console.log(`  Amount: ${p.amount} RUB / ${p.amountUsdt} USDT`);
      console.log(`  Total: ${p.total} RUB / ${p.totalUsdt} USDT`);
      console.log(`  Trader Fee: ${p.traderFeeOut}%`);
      console.log(`  Actual Total USDT: ${p.actualTotalUsdt}`);
      console.log(`  Profit: ${p.actualTotalUsdt - p.amountUsdt} USDT`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();