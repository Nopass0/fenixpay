import { db } from "../db";

async function main() {
  console.log("Creating test payouts with different statuses...");
  
  // Find test merchant
  const merchant = await db.merchant.findFirst({
    where: { name: { contains: "test", mode: "insensitive" } }
  });
  
  if (!merchant) {
    console.error("Test merchant not found");
    return;
  }
  
  // Find a trader
  const trader = await db.user.findFirst({
    where: { email: "trader@test.com" }
  });
  
  if (!trader) {
    console.error("Test trader not found");
    return;
  }
  
  const now = new Date();
  
  // Create payouts with different statuses
  const payouts = [
    // CREATED - available in pool
    {
      merchantId: merchant.id,
      amount: 5000,
      amountUsdt: 50,
      total: 5000,
      totalUsdt: 50,
      rate: 100,
      wallet: "1234567890123456",
      bank: "Сбербанк",
      isCard: true,
      status: "CREATED" as const,
      expireAt: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes
    },
    // ACTIVE - assigned to trader
    {
      merchantId: merchant.id,
      traderId: trader.id,
      amount: 7500,
      amountUsdt: 75,
      total: 7500,
      totalUsdt: 75,
      rate: 100,
      wallet: "2345678901234567",
      bank: "Тинькофф",
      isCard: true,
      status: "ACTIVE" as const,
      acceptedAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
      expireAt: new Date(now.getTime() + 20 * 60 * 1000), // 20 minutes
    },
    // CHECKING - in verification
    {
      merchantId: merchant.id,
      traderId: trader.id,
      amount: 10000,
      amountUsdt: 100,
      total: 10000,
      totalUsdt: 100,
      rate: 100,
      wallet: "3456789012345678",
      bank: "ВТБ",
      isCard: true,
      status: "CHECKING" as const,
      acceptedAt: new Date(now.getTime() - 30 * 60 * 1000),
      expireAt: new Date(now.getTime() + 60 * 60 * 1000),
      proofFiles: ["https://example.com/proof1.jpg"],
    },
    // COMPLETED
    {
      merchantId: merchant.id,
      traderId: trader.id,
      amount: 15000,
      amountUsdt: 150,
      total: 15000,
      totalUsdt: 150,
      rate: 100,
      wallet: "4567890123456789",
      bank: "Альфа-Банк",
      isCard: true,
      status: "COMPLETED" as const,
      acceptedAt: new Date(now.getTime() - 60 * 60 * 1000),
      confirmedAt: new Date(now.getTime() - 30 * 60 * 1000),
      expireAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
    // CANCELLED
    {
      merchantId: merchant.id,
      traderId: trader.id,
      amount: 3000,
      amountUsdt: 30,
      total: 3000,
      totalUsdt: 30,
      rate: 100,
      wallet: "5678901234567890",
      bank: "Райффайзен",
      isCard: true,
      status: "CANCELLED" as const,
      acceptedAt: new Date(now.getTime() - 45 * 60 * 1000),
      cancelledAt: new Date(now.getTime() - 15 * 60 * 1000),
      cancelReason: "Недостаточно средств на карте",
      expireAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
  ];
  
  for (const payoutData of payouts) {
    const payout = await db.payout.create({
      data: payoutData as any,
    });
    console.log(`Created ${payout.status} payout with ID ${payout.numericId}`);
  }
  
  console.log("Test payouts created successfully!");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());