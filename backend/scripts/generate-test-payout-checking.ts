import { db } from "../src/db";

async function main() {
  try {
    // Find a test merchant
    const merchant = await db.user.findFirst({
      where: { 
        role: "MERCHANT",
        merchantSettings: { isNot: null }
      },
      include: { merchantSettings: true }
    });

    if (!merchant) {
      console.error("No merchant found with settings");
      return;
    }

    // Find a test trader  
    const trader = await db.user.findFirst({
      where: { 
        role: "TRADER",
        isActive: true,
        payoutBalance: { gt: 0 }
      }
    });

    if (!trader) {
      console.error("No active trader found with balance");
      return;
    }

    // Create a payout in CHECKING status
    const payout = await db.payout.create({
      data: {
        merchantId: merchant.id,
        traderId: trader.id,
        amount: 5000,
        amountUsdt: 50,
        total: 5250, // Including 5% fee
        totalUsdt: 52.5,
        rate: 100,
        rateDelta: 2,
        feePercent: 5,
        wallet: "1234567890123456",
        bank: "Тинькофф",
        isCard: true,
        status: "CHECKING",
        direction: "OUT",
        expireAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        acceptedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        externalReference: `CHECK-${Date.now()}`,
        proofFiles: [
          "https://example.com/proof1.jpg",
          "https://example.com/proof2.jpg"
        ]
      }
    });

    console.log("✅ Created test payout in CHECKING status:");
    console.log(`   ID: ${payout.id}`);
    console.log(`   Numeric ID: ${payout.numericId}`);
    console.log(`   Status: ${payout.status}`);
    console.log(`   Amount: ${payout.amount} RUB`);
    console.log(`   Merchant: ${merchant.name}`);
    console.log(`   Trader: #${trader.numericId}`);

  } catch (error) {
    console.error("Error creating test payout:", error);
  } finally {
    await db.$disconnect();
  }
}

main();