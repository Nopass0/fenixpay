import { db } from './src/db';

async function checkTraders() {
  // Check traders
  const traders = await db.user.findMany({
    where: {
      banned: false
    },
    select: {
      id: true,
      name: true,
      deposit: true,
      trafficEnabled: true,
      bankDetails: {
        where: {
          isArchived: false,
          isActive: true
        },
        select: {
          id: true,
          methodType: true,
          minAmount: true,
          maxAmount: true
        }
      }
    }
  });

  console.log('Traders found:', traders.length);
  for (const trader of traders) {
    console.log(`  - ${trader.name} (${trader.id})`);
    console.log(`    Deposit: ${trader.deposit}, Traffic: ${trader.trafficEnabled}`);
    console.log(`    Bank details: ${trader.bankDetails.length}`);
    for (const bd of trader.bankDetails) {
      console.log(`      - ${bd.methodType}: ${bd.minAmount}-${bd.maxAmount}`);
    }
  }

  // Check aggregators
  const aggregators = await db.aggregator.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      name: true,
      balanceUsdt: true,
      minBalance: true,
      requiresInsuranceDeposit: true
    }
  });

  console.log('\nAggregators found:', aggregators.length);
  for (const agg of aggregators) {
    console.log(`  - ${agg.name} (${agg.id})`);
    console.log(`    Balance: ${agg.balanceUsdt} USDT, Min: ${agg.minBalance}, Requires deposit: ${agg.requiresInsuranceDeposit}`);
  }
  
  await db.$disconnect();
}

checkTraders().catch(console.error);
