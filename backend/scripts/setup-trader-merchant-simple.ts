import { db } from "../src/db";

async function main() {
  try {
    // Find all merchants
    const merchants = await db.merchant.findMany();
    console.log("Found merchants:", merchants.map(m => ({ id: m.id, name: m.name })));
    
    // Find all traders  
    const traders = await db.user.findMany({
      take: 5
    });
    console.log("Found users:", traders.map(t => ({ id: t.id, email: t.email })));
    
    // Find all methods
    const methods = await db.method.findMany();
    console.log("Found methods:", methods.map(m => ({ id: m.id, code: m.code })));
    
    if (merchants.length > 0 && traders.length > 0 && methods.length > 0) {
      const merchant = merchants[0];
      const trader = traders[0];
      const method = methods[0];
      
      // Create trader-merchant relationship
      const traderMerchant = await db.traderMerchant.upsert({
        where: {
          traderId_merchantId_methodId: {
            traderId: trader.id,
            merchantId: merchant.id,
            methodId: method.id
          }
        },
        update: {
          feeOut: 10,
          isFeeOutEnabled: true,
          isMerchantEnabled: true
        },
        create: {
          traderId: trader.id,
          merchantId: merchant.id,
          methodId: method.id,
          feeOut: 10,
          feeIn: 5,
          isFeeOutEnabled: true,
          isFeeInEnabled: true,
          isMerchantEnabled: true
        }
      });
      
      console.log("✅ Created/updated TraderMerchant:", traderMerchant);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();