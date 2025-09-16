import { db } from "@/db";
import { Status, DealDisputeStatus, WithdrawalDisputeStatus } from "@prisma/client";

async function testDashboardQuery() {
  try {
    // Get trader
    const trader = await db.user.findFirst({
      where: { email: "trader@test.com" }
    });

    if (!trader) {
      console.error("No trader found");
      return;
    }

    console.log("Testing dashboard query for trader:", trader.email);
    const traderId = trader.id;
    const period = "today";
    const now = new Date();
    let startDate: Date;

    // Calculate start date based on period
    switch (period) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    console.log("Start date:", startDate);

    // Get financial stats
    console.log("\n1. Testing financial stats query...");
    try {
      const [deals, profits] = await Promise.all([
        // Count and sum completed deals
        db.transaction.aggregate({
          where: {
            OR: [
              { traderId },
              { payout: { traderId } }
            ],
            status: Status.READY,
            createdAt: { gte: startDate }
          },
          _count: true,
          _sum: {
            amount: true
          }
        }),
        // Calculate profits (commission earned)
        db.transaction.aggregate({
          where: {
            OR: [
              { traderId },
              { payout: { traderId } }
            ],
            status: Status.READY,
            createdAt: { gte: startDate }
          },
          _sum: {
            traderAmount: true
          }
        })
      ]);
      console.log("✓ Financial stats query successful");
      console.log("  Deals count:", deals._count);
      console.log("  Deals sum:", deals._sum.amount);
    } catch (error) {
      console.error("✗ Financial stats query failed:", error);
    }

    // Get recent deals
    console.log("\n2. Testing recent deals query...");
    try {
      const recentDeals = await db.transaction.findMany({
        where: {
          OR: [
            { traderId },
            { payout: { traderId } }
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          bankDetail: true,
          payout: true
        }
      });
      console.log("✓ Recent deals query successful");
      console.log("  Found", recentDeals.length, "recent deals");
    } catch (error) {
      console.error("✗ Recent deals query failed:", error);
    }

    // Get open disputes
    console.log("\n3. Testing disputes query...");
    try {
      const [dealDisputes, withdrawalDisputes] = await Promise.all([
        db.dealDispute.findMany({
          where: {
            deal: { traderId },
            status: { in: [DealDisputeStatus.OPEN, DealDisputeStatus.IN_PROGRESS] }
          },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            deal: true
          }
        }),
        db.withdrawalDispute.findMany({
          where: {
            payout: { traderId },
            status: { in: [WithdrawalDisputeStatus.OPEN, WithdrawalDisputeStatus.IN_PROGRESS] }
          },
          orderBy: { createdAt: "desc" },
          take: 2,
          include: {
            payout: true
          }
        })
      ]);
      console.log("✓ Disputes query successful");
      console.log("  Deal disputes:", dealDisputes.length);
      console.log("  Withdrawal disputes:", withdrawalDisputes.length);
    } catch (error) {
      console.error("✗ Disputes query failed:", error);
    }

    // Get devices
    console.log("\n4. Testing devices query...");
    try {
      const devices = await db.device.findMany({
        where: { userId: traderId },
        orderBy: { createdAt: "desc" },
        include: {
          bankDetails: true
        }
      });
      console.log("✓ Devices query successful");
      console.log("  Found", devices.length, "devices");
    } catch (error) {
      console.error("✗ Devices query failed:", error);
    }

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await db.$disconnect();
  }
}

testDashboardQuery();