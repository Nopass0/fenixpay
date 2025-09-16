import { db } from "../src/db";

async function main() {
  try {
    // Find test merchant
    const merchant = await db.merchant.findFirst({
      where: { name: "Test Merchant" }
    });
    
    if (!merchant) {
      console.error("❌ Test Merchant not found");
      process.exit(1);
    }
    
    // Find trader
    const trader = await db.user.findFirst({
      where: { 
        OR: [
          { email: "trader@example.com" },
          { email: "trader@chase.com" }
        ]
      }
    });
    
    if (!trader) {
      console.error("❌ Trader not found");
      process.exit(1);
    }
    
    // Find or create method
    const method = await db.method.findFirst({
      where: { code: "CARD_RUB" }
    });
    
    if (!method) {
      console.error("❌ Method CARD_RUB not found");
      process.exit(1);
    }
    
    // Create or update trader-merchant relationship with 10% fee
    const traderMerchant = await db.traderMerchant.upsert({
      where: {
        traderId_merchantId_methodId: {
          traderId: trader.id,
          merchantId: merchant.id,
          methodId: method.id
        }
      },
      update: {
        feeOut: 10, // 10% commission for payouts
        isFeeOutEnabled: true,
        isMerchantEnabled: true
      },
      create: {
        traderId: trader.id,
        merchantId: merchant.id,
        methodId: method.id,
        feeOut: 10, // 10% commission for payouts
        feeIn: 5,   // 5% commission for deposits
        isFeeOutEnabled: true,
        isFeeInEnabled: true,
        isMerchantEnabled: true
      }
    });
    
    console.log("✅ TraderMerchant relationship created/updated:");
    console.log(`   Trader: ${trader.email}`);
    console.log(`   Merchant: ${merchant.name}`);
    console.log(`   Fee Out: ${traderMerchant.feeOut}%`);
    console.log(`   Fee In: ${traderMerchant.feeIn}%`);
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
