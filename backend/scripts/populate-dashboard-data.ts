import { db } from "@/db";
import { Status, PayoutStatus, DealDisputeStatus, WithdrawalDisputeStatus, MethodType, BankType } from "@prisma/client";

async function populateDashboardData() {
  try {
    // Find or create a trader with some data
    const trader = await db.user.findFirst({
      where: { 
        email: "trader@test.com"
      }
    });

    if (!trader) {
      console.error("No trader found with email test@test.com");
      return;
    }

    console.log("Found trader:", trader.email);

    // Create some devices if none exist
    const existingDevices = await db.device.count({ where: { userId: trader.id } });
    if (existingDevices === 0) {
      console.log("Creating devices...");
      await db.device.createMany({
        data: [
          {
            traderId: trader.id,
            name: "iPhone 14 Pro",
            token: "device-token-001",
            isOnline: true,
            lastActiveAt: new Date()
          },
          {
            traderId: trader.id,
            name: "Samsung Galaxy S23",
            token: "device-token-002",
            isOnline: false,
            lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
          }
        ]
      });
    }

    // Create some requisites if none exist
    const existingRequisites = await db.bankDetail.count({ where: { userId: trader.id } });
    if (existingRequisites === 0) {
      console.log("Creating requisites...");
      
      const device = await db.device.findFirst({ where: { userId: trader.id } });
      if (device) {
        await db.bankDetail.createMany({
          data: [
            {
              traderId: trader.id,
              deviceId: device.id,
              methodType: MethodType.CARD_NUMBER,
              bankType: BankType.SBERBANK,
              cardNumber: "4111111111111111",
              recipientName: "Иван Иванов",
              phoneNumber: "+79001234567",
              minAmount: 100,
              maxAmount: 50000,
              dailyLimit: 1000000,
              monthlyLimit: 10000000,
              dailyTraffic: 150000,
              monthlyTraffic: 2500000
            },
            {
              traderId: trader.id,
              deviceId: device.id,
              methodType: MethodType.CARD_NUMBER,
              bankType: BankType.TBANK,
              cardNumber: "5555555555554444",
              recipientName: "Петр Петров",
              phoneNumber: "+79001234568",
              minAmount: 100,
              maxAmount: 50000,
              dailyLimit: 1000000,
              monthlyLimit: 10000000,
              dailyTraffic: 50000,
              monthlyTraffic: 800000
            }
          ]
        });
      }
    }

    // Get requisites for transactions
    const requisites = await db.bankDetail.findMany({ 
      where: { userId: trader.id },
      take: 2 
    });

    // Create recent transactions
    console.log("Creating recent transactions...");
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const transactions = [];

    // Today's transactions
    for (let i = 0; i < 5; i++) {
      const createdAt = new Date(now.getTime() - i * 60 * 60 * 1000); // Each hour back
      transactions.push({
        amount: 50 + Math.random() * 150, // 50-200 USDT
        currency: "USDT",
        rate: 100,
        status: i === 0 ? Status.IN_PROGRESS : i === 1 ? Status.CREATED : Status.READY,
        userId: trader.id,
        traderId: trader.id,
        bankDetailId: requisites[i % requisites.length]?.id,
        clientName: `Клиент ${i + 1}`,
        merchantId: "cmcz5rz130002ikkl749c5m9u",
        assetOrBank: ["Сбербанк", "Тинькофф", "ВТБ", "Альфа-Банк"][i % 4],
        orderId: `order-today-${i}`,
        callbackUri: "https://example.com/callback",
        successUri: "https://example.com/success",
        failUri: "https://example.com/fail",
        expired_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        commission: 0.5,
        methodId: "cmcz5rz1a0003ikkl0ngc7a89",
        createdAt,
        updatedAt: createdAt
      });
    }

    // Yesterday's transactions
    for (let i = 0; i < 3; i++) {
      const createdAt = new Date(now.getTime() - 24 * 60 * 60 * 1000 - i * 2 * 60 * 60 * 1000);
      transactions.push({
        amount: 100 + Math.random() * 200,
        currency: "USDT",
        rate: 100,
        status: Status.READY,
        userId: trader.id,
        traderId: trader.id,
        bankDetailId: requisites[i % requisites.length]?.id,
        clientName: `Клиент ${i + 6}`,
        merchantId: "cmcz5rz130002ikkl749c5m9u",
        assetOrBank: ["Сбербанк", "Тинькофф", "ВТБ"][i % 3],
        orderId: `order-yesterday-${i}`,
        callbackUri: "https://example.com/callback",
        successUri: "https://example.com/success",
        failUri: "https://example.com/fail",
        expired_at: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
        commission: 0.5,
        methodId: "cmcz5rz1a0003ikkl0ngc7a89",
        createdAt,
        updatedAt: createdAt
      });
    }

    // One expired and one canceled
    transactions.push({
      amount: 75,
      currency: "USDT",
      rate: 100,
      status: Status.EXPIRED,
      userId: trader.id,
      traderId: trader.id,
      bankDetailId: requisites[0]?.id,
      clientName: "Тест Тестов",
      merchantId: "cmcz5rz130002ikkl749c5m9u",
      assetOrBank: "Сбербанк",
      orderId: "order-expired",
      callbackUri: "https://example.com/callback",
      successUri: "https://example.com/success",
      failUri: "https://example.com/fail",
      expired_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      commission: 0.5,
      methodId: "cmcz5rz1a0003ikkl0ngc7a89",
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000)
    });

    await db.transaction.createMany({ data: transactions });

    // Create a deal dispute
    const disputeTransaction = await db.transaction.findFirst({
      where: { 
        traderId: trader.id,
        status: Status.READY
      }
    });

    if (disputeTransaction) {
      const existingDispute = await db.dealDispute.findUnique({
        where: { dealId: disputeTransaction.id }
      });
      
      if (!existingDispute) {
        console.log("Creating deal dispute...");
        await db.dealDispute.create({
          data: {
            dealId: disputeTransaction.id,
            traderId: trader.id,
            merchantId: "cmcz5rz130002ikkl749c5m9u",
            status: DealDisputeStatus.OPEN,
            createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000)
          }
        });
      }
    }

    // Create a payout for dispute
    const payout = await db.payout.create({
      data: {
        merchantId: "cmcz5rz130002ikkl749c5m9u",
        traderId: trader.id,
        amount: 100,
        amountUsdt: 100,
        total: 100,
        totalUsdt: 100,
        rate: 100,
        wallet: "TRC20-wallet-address",
        bank: "USDT TRC-20",
        isCard: false,
        status: PayoutStatus.COMPLETED,
        expireAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000)
      }
    });

    // Create withdrawal dispute
    console.log("Creating withdrawal dispute...");
    await db.withdrawalDispute.create({
      data: {
        payoutId: payout.id,
        traderId: trader.id,
        merchantId: "cmcz5rz130002ikkl749c5m9u",
        status: WithdrawalDisputeStatus.IN_PROGRESS
      }
    });

    // Update device states for events
    const devices = await db.device.findMany({ where: { userId: trader.id } });
    for (const device of devices) {
      await db.device.update({
        where: { id: device.id },
        data: {
          updatedAt: new Date(now.getTime() - Math.random() * 12 * 60 * 60 * 1000)
        }
      });
    }

    console.log("Dashboard data populated successfully!");

  } catch (error) {
    console.error("Error populating dashboard data:", error);
  } finally {
    await db.$disconnect();
  }
}

populateDashboardData();