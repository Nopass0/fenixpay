import { db } from "../db";
import { PayoutService } from "../services/payout.service";

async function seedPayouts() {
  try {
    const payoutService = PayoutService.getInstance();
    
    // Find or create a test merchant
    let merchant = await db.merchant.findFirst({
      where: { name: "Test Merchant" }
    });
    
    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          name: "Test Merchant",
          apiToken: "test-merchant-token-" + Date.now(),
          ipWhitelist: ["127.0.0.1"],
          webhookUrl: "http://localhost:3001/webhook",
          maxDailyLimit: 1000000,
          maxTransactionLimit: 100000,
        }
      });
      console.log("Created test merchant:", merchant.name);
    }
    
    // Create multiple test payouts
    const banks = ["Сбербанк", "Тинькофф", "ВТБ", "Альфа-банк", "СБП"];
    const amounts = [5000, 10000, 15000, 25000, 30000, 50000];
    
    for (let i = 0; i < 10; i++) {
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      const bank = banks[Math.floor(Math.random() * banks.length)];
      const isCard = Math.random() > 0.5;
      const rate = 95 + Math.random() * 10; // 95-105
      
      let wallet: string;
      if (isCard) {
        const cardPrefix = ["5469", "4276", "2200", "5536"][Math.floor(Math.random() * 4)];
        wallet = `${cardPrefix} ${Math.floor(Math.random() * 9000 + 1000)} ${
          Math.floor(Math.random() * 9000 + 1000)
        } ${Math.floor(Math.random() * 9000 + 1000)}`;
      } else {
        wallet = `7${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
      }
      
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount,
        wallet,
        bank,
        isCard,
        rate,
        processingTime: 15 + Math.floor(Math.random() * 15), // 15-30 minutes
        metadata: {
          source: "seed",
          index: i
        }
      });
      
      console.log(`Created payout #${payout.numericId}: ${amount} RUB to ${wallet.substring(0, 4)}****`);
      
      // Make some payouts active (accepted by traders)
      if (i < 3) {
        // Find a trader
        const trader = await db.user.findFirst({
          where: {
            banned: false,
            payoutBalance: { gte: payout.total }
          }
        });
        
        if (trader && trader.payoutBalance >= payout.total) {
          try {
            await payoutService.acceptPayout(payout.id, trader.id);
            console.log(`  -> Accepted by trader ${trader.email}`);
          } catch (error) {
            console.log(`  -> Could not accept: ${error.message}`);
          }
        }
      }
    }
    
    console.log("\nDone! Created test payouts.");
    
  } catch (error) {
    console.error("Error seeding payouts:", error);
  } finally {
    await db.$disconnect();
  }
}

seedPayouts();