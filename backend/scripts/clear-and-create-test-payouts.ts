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

    // Clear old payouts for this trader
    const deletedPayouts = await db.payout.deleteMany({
      where: {
        OR: [
          { traderId: trader.id },
          { traderId: null } // Also delete unassigned payouts
        ]
      }
    });

    console.log(`✅ Deleted ${deletedPayouts.count} old payouts`);

    // Find or create a test merchant
    let merchant = await db.merchant.findFirst({
      where: { 
        name: "Test Merchant"
      }
    });

    if (!merchant) {
      // Create a test merchant
      merchant = await db.merchant.create({
        data: {
          name: "Test Merchant",
          token: `test-merchant-${Date.now()}`,
          balanceUsdt: 10000
        }
      });
      console.log("✅ Created new merchant:", merchant.name);
    } else {
      console.log(`Using existing merchant: ${merchant.name}`);
    }

    // Create new test payouts
    const payoutsToCreate = [
      {
        // Payout 1: Ready to accept (CREATED)
        merchantId: merchant.id,
        amount: 5000,
        amountUsdt: 50,
        total: 5250,
        totalUsdt: 52.5,
        rate: 100,
        rateDelta: 2,
        feePercent: 5,
        wallet: "5536913853214567",
        bank: "Тинькофф",
        isCard: true,
        status: "CREATED",
        direction: "OUT",
        expireAt: new Date(Date.now() + 25 * 60 * 1000), // 25 minutes
        externalReference: `TEST-${Date.now()}-1`
      },
      {
        // Payout 2: Ready to accept (CREATED)
        merchantId: merchant.id,
        amount: 10000,
        amountUsdt: 100,
        total: 10500,
        totalUsdt: 105,
        rate: 100,
        rateDelta: 2,
        feePercent: 5,
        wallet: "4276123456789012",
        bank: "Сбербанк",
        isCard: true,
        status: "CREATED",
        direction: "OUT",
        expireAt: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes
        externalReference: `TEST-${Date.now()}-2`
      },
      {
        // Payout 3: Already accepted by trader (ACTIVE)
        merchantId: merchant.id,
        traderId: trader.id,
        amount: 7500,
        amountUsdt: 75,
        total: 7875,
        totalUsdt: 78.75,
        rate: 100,
        rateDelta: 2,
        feePercent: 5,
        wallet: "2200123456789012",
        bank: "ВТБ",
        isCard: true,
        status: "ACTIVE",
        direction: "OUT",
        expireAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        acceptedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        externalReference: `TEST-${Date.now()}-3`
      },
      {
        // Payout 4: In checking status
        merchantId: merchant.id,
        traderId: trader.id,
        amount: 15000,
        amountUsdt: 150,
        total: 15750,
        totalUsdt: 157.5,
        rate: 100,
        rateDelta: 2,
        feePercent: 5,
        wallet: "5469123456789012",
        bank: "Альфа-Банк",
        isCard: true,
        status: "CHECKING",
        direction: "OUT",
        expireAt: new Date(Date.now() + 30 * 60 * 1000),
        acceptedAt: new Date(Date.now() - 10 * 60 * 1000),
        proofFiles: ["https://example.com/proof1.jpg", "https://example.com/proof2.jpg"],
        externalReference: `TEST-${Date.now()}-4`
      },
      {
        // Payout 5: Completed
        merchantId: merchant.id,
        traderId: trader.id,
        amount: 25000,
        amountUsdt: 250,
        total: 26250,
        totalUsdt: 262.5,
        rate: 100,
        rateDelta: 2,
        feePercent: 5,
        wallet: "4100123456789012",
        bank: "Газпромбанк",
        isCard: true,
        status: "COMPLETED",
        direction: "OUT",
        expireAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        acceptedAt: new Date(Date.now() - 90 * 60 * 1000), // 1.5 hours ago
        confirmedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        externalReference: `TEST-${Date.now()}-5`
      },
      {
        // Payout 6: Ready to accept with SBP
        merchantId: merchant.id,
        amount: 3000,
        amountUsdt: 30,
        total: 3150,
        totalUsdt: 31.5,
        rate: 100,
        rateDelta: 2,
        feePercent: 5,
        wallet: "+79123456789",
        bank: "СБП",
        isCard: false,
        status: "CREATED",
        direction: "OUT",
        expireAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        externalReference: `TEST-${Date.now()}-6`
      }
    ];

    const createdPayouts = await db.payout.createMany({
      data: payoutsToCreate
    });

    console.log(`✅ Created ${createdPayouts.count} new test payouts`);

    // Update trader balance to ensure they can accept payouts
    await db.user.update({
      where: { id: trader.id },
      data: {
        payoutBalance: 100000,
        frozenPayoutBalance: 0
      }
    });

    console.log("✅ Updated trader balance");

    // List created payouts
    const newPayouts = await db.payout.findMany({
      where: {
        OR: [
          { traderId: trader.id },
          { traderId: null }
        ]
      },
      orderBy: { createdAt: "desc" }
    });

    console.log("\n📋 Created payouts:");
    newPayouts.forEach(p => {
      console.log(`  - #${p.numericId}: ${p.amount} RUB (${p.status}) - ${p.bank} ${p.wallet}`);
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();