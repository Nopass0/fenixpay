import { db } from "../db";

async function checkPayouts() {
  const payouts = await db.payout.findMany({
    include: {
      trader: true,
      merchant: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log(`Found ${payouts.length} payouts:\n`);
  
  for (const payout of payouts) {
    console.log(`ID: ${payout.id}`);
    console.log(`Numeric ID: ${payout.numericId}`);
    console.log(`Status: ${payout.status}`);
    console.log(`Direction: ${payout.direction}`);
    console.log(`Amount: ${payout.amount} RUB`);
    console.log(`Trader: ${payout.trader?.email || 'NOT ASSIGNED'}`);
    console.log(`Merchant: ${payout.merchant.name}`);
    console.log(`Created: ${payout.createdAt}`);
    console.log(`Expires: ${payout.expireAt}`);
    console.log(`---`);
  }
}

checkPayouts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });