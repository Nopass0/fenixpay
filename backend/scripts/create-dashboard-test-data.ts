import { db } from "@/db";
import { Status } from "@prisma/client";

async function createDashboardTestData() {
  try {
    // Get an existing trader
    const trader = await db.user.findFirst({
      where: { email: "trader@test.com" }
    });

    if (!trader) {
      console.error("No trader found");
      return;
    }

    console.log("Creating dashboard test data for:", trader.email);

    // Get method
    const method = await db.method.findFirst();
    if (!method) {
      console.error("No payment method found");
      return;
    }

    // Create some recent transactions
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const transactions = [];
    
    // Create 5 transactions for today
    for (let i = 0; i < 5; i++) {
      const amount = 100 + Math.random() * 400; // 100-500 USDT
      transactions.push({
        amount,
        assetOrBank: ["Сбербанк", "Тинькофф", "ВТБ", "Альфа-Банк"][i % 4],
        orderId: `order-today-${i}`,
        currency: "RUB",
        userId: trader.id,
        callbackUri: "https://example.com/callback",
        successUri: "https://example.com/success",
        failUri: "https://example.com/fail",
        expired_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        commission: 0.5,
        clientName: ["Иван Иванов", "Петр Петров", "Мария Сидорова"][i % 3],
        status: i === 0 ? Status.IN_PROGRESS : i === 1 ? Status.CREATED : Status.READY,
        rate: 100,
        traderId: trader.id,
        methodId: method.id,
        calculatedCommission: amount * 0.005,
        createdAt: new Date(now.getTime() - i * 2 * 60 * 60 * 1000),
        merchantId: "cmcz5rz130002ikkl749c5m9u"
      });
    }
    
    // Create 3 transactions for yesterday
    for (let i = 0; i < 3; i++) {
      const amount = 200 + Math.random() * 300;
      transactions.push({
        amount,
        assetOrBank: ["Сбербанк", "Тинькофф", "ВТБ"][i % 3],
        orderId: `order-yesterday-${i}`,
        currency: "RUB",
        userId: trader.id,
        callbackUri: "https://example.com/callback",
        successUri: "https://example.com/success",
        failUri: "https://example.com/fail",
        expired_at: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
        commission: 0.5,
        clientName: ["Олег Олегов", "Анна Петрова", "Сергей Сергеев"][i % 3],
        status: Status.READY,
        rate: 100,
        traderId: trader.id,
        methodId: method.id,
        calculatedCommission: amount * 0.005,
        createdAt: new Date(yesterday.getTime() - i * 3 * 60 * 60 * 1000),
        merchantId: "cmcz5rz130002ikkl749c5m9u"
      });
    }
    
    // Add one expired transaction
    transactions.push({
      amount: 150,
      assetOrBank: "Сбербанк",
      orderId: "order-expired",
      currency: "RUB",
      userId: trader.id,
      callbackUri: "https://example.com/callback",
      successUri: "https://example.com/success",
      failUri: "https://example.com/fail",
      expired_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      commission: 0.5,
      clientName: "Тест Тестов",
      status: Status.EXPIRED,
      rate: 100,
      traderId: trader.id,
      methodId: method.id,
      calculatedCommission: 0,
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      merchantId: "test-merchant"
    });

    await db.transaction.createMany({ data: transactions });
    console.log(`Created ${transactions.length} test transactions`);

    // Update trader balance to reflect profits
    const totalProfit = transactions
      .filter(t => t.status === Status.READY)
      .reduce((sum, t) => sum + (t.calculatedCommission || 0), 0);
    
    await db.user.update({
      where: { id: trader.id },
      data: {
        profitFromDeals: { increment: totalProfit },
        balanceUsdt: { increment: totalProfit }
      }
    });
    
    console.log(`Updated trader balance with profit: ${totalProfit.toFixed(2)} USDT`);
    console.log("Dashboard test data created successfully!");

  } catch (error) {
    console.error("Error creating test data:", error);
  } finally {
    await db.$disconnect();
  }
}

createDashboardTestData();