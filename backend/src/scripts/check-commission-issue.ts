import { db } from "@/db";

async function checkCommissionIssue() {
  console.log("=== Checking Commission Issue ===\n");
  
  // Get recent transactions with trader info
  const transactions = await db.transaction.findMany({
    where: {
      type: 'IN',
      traderId: { not: null }
    },
    include: {
      trader: true,
      merchant: true,
      method: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  for (const tx of transactions) {
    console.log(`\nTransaction ${tx.id}:`);
    console.log(`  Amount: ${tx.amount} RUB`);
    console.log(`  Status: ${tx.status}`);
    console.log(`  Trader: ${tx.trader?.email}`);
    console.log(`  Merchant: ${tx.merchant?.name}`);
    console.log(`  Method: ${tx.method?.name}`);
    console.log(`  Rate: ${tx.rate}`);
    console.log(`  KKK %: ${tx.kkkPercent}`);
    console.log(`  Fee %: ${tx.feeInPercent}`);
    console.log(`  Frozen USDT: ${tx.frozenUsdtAmount}`);
    console.log(`  Commission: ${tx.calculatedCommission}`);
    
    // Check trader-merchant settings
    if (tx.traderId && tx.merchantId && tx.methodId) {
      const traderMerchant = await db.traderMerchant.findUnique({
        where: {
          traderId_merchantId_methodId: {
            traderId: tx.traderId,
            merchantId: tx.merchantId,
            methodId: tx.methodId
          }
        }
      });
      
      if (traderMerchant) {
        console.log(`  TraderMerchant settings:`);
        console.log(`    Fee In %: ${traderMerchant.feeIn}`);
        console.log(`    Fee Out %: ${traderMerchant.feeOut}`);
        console.log(`    Fee In Enabled: ${traderMerchant.isFeeInEnabled}`);
        console.log(`    Fee Out Enabled: ${traderMerchant.isFeeOutEnabled}`);
      } else {
        console.log(`  No TraderMerchant settings found!`);
      }
    }
  }
  
  console.log("\n=== Checking if commissions are properly saved ===");
  
  // Check a trader with known settings
  const tradersWithSettings = await db.traderMerchant.findMany({
    where: {
      feeIn: { gt: 0 }
    },
    include: {
      trader: true,
      merchant: true,
      method: true
    },
    take: 5
  });
  
  console.log(`\nFound ${tradersWithSettings.length} traders with commission settings:`);
  
  for (const tm of tradersWithSettings) {
    console.log(`\nTrader: ${tm.trader.email}`);
    console.log(`Merchant: ${tm.merchant.name}`);
    console.log(`Method: ${tm.method.name}`);
    console.log(`Fee In: ${tm.feeIn}%`);
    console.log(`Fee Out: ${tm.feeOut}%`);
    
    // Check recent transactions for this trader
    const recentTx = await db.transaction.findFirst({
      where: {
        traderId: tm.traderId,
        merchantId: tm.merchantId,
        type: 'IN'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (recentTx) {
      console.log(`Latest transaction:`);
      console.log(`  ID: ${recentTx.id}`);
      console.log(`  Fee % saved: ${recentTx.feeInPercent}`);
      console.log(`  Commission: ${recentTx.calculatedCommission}`);
    }
  }
}

checkCommissionIssue().catch(console.error);