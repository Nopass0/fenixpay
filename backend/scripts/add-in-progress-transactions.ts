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

    // Create IN_PROGRESS transactions
    const transactionsToCreate = [];
    const banks = ["SBERBANK", "TBANK", "VTB", "ALFABANK", "RAIFFEISEN"];
    const clientNames = [
      "Иван Петров",
      "Мария Сидорова", 
      "Алексей Козлов",
      "Елена Новикова",
      "Дмитрий Соколов",
      "Ольга Васильева",
      "Сергей Михайлов",
      "Анна Федорова"
    ];
    
    // Create 8 IN_PROGRESS transactions
    for (let i = 1; i <= 8; i++) {
      const amount = Math.floor(Math.random() * 30000) + 10000; // 10,000 - 40,000
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 20 * 60 * 1000)); // Within last 20 minutes
      const rate = 94 + Math.random() * 4; // Rate between 94-98
      
      transactionsToCreate.push({
        merchantId: merchant.id,
        amount: amount,
        assetOrBank: banks[Math.floor(Math.random() * banks.length)],
        orderId: `ORDER-PROGRESS-${Date.now()}-${i}`,
        currency: "RUB",
        userId: trader.id,
        traderId: trader.id,
        userIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
        callbackUri: "https://example.com/callback",
        successUri: "https://example.com/success",
        failUri: "https://example.com/fail",
        clientName: clientNames[Math.floor(Math.random() * clientNames.length)],
        status: "IN_PROGRESS",
        type: "IN",
        bankDetailId: bankDetail.id,
        commission: amount * 0.02, // 2% commission
        rate: rate,
        frozenUsdtAmount: amount / rate, // Calculate frozen USDT
        methodId: "cmcxvoyte0000ik1sdgdw36ub", // Using c2c method ID
        expired_at: new Date(Date.now() + (30 - i * 2) * 60 * 1000), // Varying expiry times
        acceptedAt: new Date(createdAt.getTime() + 2 * 60 * 1000), // Accepted 2 minutes after creation
        createdAt: createdAt,
        updatedAt: new Date()
      });
    }

    // Create new transactions
    const createdTransactions = await db.transaction.createMany({
      data: transactionsToCreate
    });

    console.log(`✅ Created ${createdTransactions.count} new IN_PROGRESS test transactions`);

    // Update frozen balance for trader
    const totalFrozenUsdt = transactionsToCreate.reduce((sum, t) => sum + t.frozenUsdtAmount, 0);
    const totalFrozenRub = transactionsToCreate.reduce((sum, t) => sum + t.amount, 0);

    await db.user.update({
      where: { id: trader.id },
      data: {
        frozenUsdt: { increment: totalFrozenUsdt },
        frozenRub: { increment: totalFrozenRub }
      }
    });

    console.log(`✅ Updated trader frozen balance:`);
    console.log(`   Frozen USDT: +${totalFrozenUsdt.toFixed(2)}`);
    console.log(`   Frozen RUB: +${totalFrozenRub.toFixed(2)}`);

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