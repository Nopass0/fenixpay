import { db } from "../src/db";

async function main() {
  try {
    // Find the test trader
    const trader = await db.user.findFirst({
      where: { 
        email: "trader@test.com"
      }
    });

    if (!trader) {
      console.error("Trader trader@test.com not found");
      return;
    }

    console.log(`Found trader: ${trader.email} (ID: ${trader.id})`);

    // Find or create a test merchant
    let merchant = await db.merchant.findFirst({
      where: { 
        name: "Test Merchant"
      }
    });

    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          name: "Test Merchant",
          token: `test-merchant-${Date.now()}`,
          balanceUsdt: 10000
        }
      });
    }

    // Find bank details for the trader
    const bankDetail = await db.bankDetail.findFirst({
      where: {
        userId: trader.id
      }
    });

    if (!bankDetail) {
      console.error("No bank details found for trader");
      return;
    }


    // Create 20 test transactions with various statuses
    const transactionsToCreate = [];
    const banks = ["Тинькофф", "Сбербанк", "ВТБ", "Альфа-Банк", "Газпромбанк"];
    const statuses = ["READY", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "CREATED", "CANCELED", "DISPUTE", "MILK", "EXPIRED"];
    
    for (let i = 1; i <= 20; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const amount = Math.floor(Math.random() * 50000) + 5000; // 5,000 - 55,000
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)); // Random date within last 7 days
      
      let updatedAt = createdAt;
      let completedAt = null;
      
      if (status === "READY") {
        completedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 60 * 60 * 1000)); // 0-60 minutes after creation
        updatedAt = completedAt;
      } else if (status === "IN_PROGRESS") {
        updatedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 30 * 60 * 1000)); // 0-30 minutes after creation
      }

      transactionsToCreate.push({
        merchantId: merchant.id,
        amount: amount,
        assetOrBank: banks[Math.floor(Math.random() * banks.length)],
        orderId: `ORDER-${Date.now()}-${i}`,
        currency: "RUB",
        userId: trader.id,
        traderId: trader.id,
        userIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
        callbackUri: "https://example.com/callback",
        successUri: "https://example.com/success",
        failUri: "https://example.com/fail",
        clientName: trader.name,
        status: status,
        type: "IN", // All test transactions are incoming
        bankDetailId: bankDetail.id,
        commission: amount * 0.02, // 2% commission
        rate: 100,
        methodId: "cmcxvoyte0000ik1sdgdw36ub", // Using c2c method ID
        expired_at: new Date(createdAt.getTime() + 30 * 60 * 1000), // 30 minutes expiry
        acceptedAt: status !== "CREATED" && status !== "EXPIRED" ? new Date(createdAt.getTime() + 5 * 60 * 1000) : null,
        createdAt: createdAt,
        updatedAt: updatedAt
      });
    }

    // Clear old transactions for this trader
    const deletedCount = await db.transaction.deleteMany({
      where: {
        userId: trader.id
      }
    });
    console.log(`✅ Deleted ${deletedCount.count} old transactions`);

    // Create new transactions
    const createdTransactions = await db.transaction.createMany({
      data: transactionsToCreate
    });

    console.log(`✅ Created ${createdTransactions.count} new test transactions`);

    // Update trader balance based on completed transactions
    const completedAmount = transactionsToCreate
      .filter(t => t.status === "READY")
      .reduce((sum, t) => sum + t.amount, 0);

    await db.user.update({
      where: { id: trader.id },
      data: {
        profitFromDeals: completedAmount * 0.02, // 2% profit
        balanceRub: { increment: completedAmount * 0.02 }
      }
    });

    console.log(`✅ Updated trader balance with ${(completedAmount * 0.02).toFixed(2)} RUB profit`);

    // Show summary
    const summary = await db.transaction.groupBy({
      by: ['status'],
      where: { userId: trader.id },
      _count: true
    });

    console.log("\n📊 Transaction summary:");
    summary.forEach(s => {
      console.log(`  ${s.status}: ${s._count} transactions`);
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();