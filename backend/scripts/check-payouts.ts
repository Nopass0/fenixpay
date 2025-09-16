import { db } from "../src/db";

async function main() {
  try {
    // Get recent payouts
    const payouts = await db.payout.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        merchant: true,
        trader: true
      }
    });
    
    console.log("Recent payouts:");
    payouts.forEach(p => {
      console.log(`- Payout #${p.numericId}:`);
      console.log(`  Merchant: ${p.merchant.name} (${p.merchantId})`);
      console.log(`  Trader: ${p.trader?.email || 'Not assigned'} (${p.traderId || 'N/A'})`);
      console.log(`  Amount: ${p.amount} RUB / ${p.amountUsdt} USDT`);
      console.log(`  Total: ${p.total} RUB / ${p.totalUsdt} USDT`);
      console.log(`  Rate: ${p.rate}`);
      console.log(`  Status: ${p.status}`);
      console.log('---');
    });
    
    // Check trader-merchant relationships
    const traderMerchants = await db.traderMerchant.findMany({
      include: {
        trader: true,
        merchant: true,
        method: true
      }
    });
    
    console.log("\nTraderMerchant relationships:");
    traderMerchants.forEach(tm => {
      console.log(`- ${tm.trader.email} <-> ${tm.merchant.name} (${tm.method.code}):`);
      console.log(`  Fee In: ${tm.feeIn}% (enabled: ${tm.isFeeInEnabled})`);
      console.log(`  Fee Out: ${tm.feeOut}% (enabled: ${tm.isFeeOutEnabled})`);
      console.log(`  Merchant enabled: ${tm.isMerchantEnabled}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();