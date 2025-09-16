import { db } from "../db";

async function debugPayoutDistribution() {
  console.log("=== Debugging Payout Distribution ===\n");

  // Check unassigned payouts
  const unassignedPayouts = await db.payout.findMany({
    where: {
      status: "CREATED",
      traderId: null,
      expireAt: {
        gt: new Date(),
      },
    },
    include: {
      merchant: true,
    },
  });

  console.log(`Found ${unassignedPayouts.length} unassigned payouts:`);
  unassignedPayouts.forEach((payout) => {
    console.log(`- Payout ${payout.numericId}: ${payout.amount} RUB (${payout.totalUsdt} USDT)`);
  });

  // Check eligible traders
  const eligibleTraders = await db.user.findMany({
    where: {
      banned: false,
      trafficEnabled: true,
      balanceRub: {
        gt: 0,
      },
    },
    select: {
      id: true,
      email: true,
      balanceRub: true,
      balanceUsdt: true,
      payoutBalance: true,
      maxSimultaneousPayouts: true,
      trafficEnabled: true,
      banned: true,
      _count: {
        select: {
          payouts: {
            where: {
              status: "ACTIVE",
            },
          },
        },
      },
    },
  });

  console.log(`\nFound ${eligibleTraders.length} eligible traders:`);
  for (const trader of eligibleTraders) {
    console.log(`\n- ${trader.email}:`);
    console.log(`  RUB Balance: ${trader.balanceRub}`);
    console.log(`  USDT Balance: ${trader.balanceUsdt}`);
    console.log(`  Payout Balance (deprecated): ${trader.payoutBalance}`);
    console.log(`  Active Payouts: ${trader._count.payouts} / ${trader.maxSimultaneousPayouts}`);
    console.log(`  Traffic Enabled: ${trader.trafficEnabled}`);
    console.log(`  Banned: ${trader.banned}`);

    // Check if this trader can accept any unassigned payouts
    for (const payout of unassignedPayouts) {
      const canAccept = trader.balanceRub >= payout.amount && 
                       trader._count.payouts < trader.maxSimultaneousPayouts;
      
      if (canAccept) {
        console.log(`  ✓ Can accept payout ${payout.numericId} (${payout.amount} RUB)`);
      } else {
        const reasons = [];
        if (trader.balanceRub < payout.amount) {
          reasons.push(`insufficient RUB balance (need ${payout.amount}, have ${trader.balanceRub})`);
        }
        if (trader._count.payouts >= trader.maxSimultaneousPayouts) {
          reasons.push(`max payouts reached`);
        }
        console.log(`  ✗ Cannot accept payout ${payout.numericId}: ${reasons.join(', ')}`);
      }
    }
  }

  // Check all traders (not just eligible)
  console.log("\n=== All Traders ===");
  const allTraders = await db.user.findMany({
    select: {
      id: true,
      email: true,
      balanceRub: true,
      balanceUsdt: true,
      payoutBalance: true,
      trafficEnabled: true,
      banned: true,
    },
  });

  console.log(`Total traders: ${allTraders.length}`);
  allTraders.forEach((trader) => {
    console.log(`- ${trader.email}: RUB ${trader.balanceRub}, USDT ${trader.balanceUsdt}, Traffic: ${trader.trafficEnabled}, Banned: ${trader.banned}`);
  });

  // Exit
  process.exit(0);
}

debugPayoutDistribution().catch(console.error);