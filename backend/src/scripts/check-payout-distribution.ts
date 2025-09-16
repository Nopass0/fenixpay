import { db } from "../db";

async function main() {
  console.log("Checking payout distribution...");
  
  const trader = await db.user.findUnique({
    where: { email: "trader@test.com" },
    select: { id: true, email: true }
  });
  
  if (!trader) {
    console.error("Test trader not found");
    return;
  }
  
  console.log("Trader ID:", trader.id);
  
  // Check all payouts and their assignment
  const payouts = await db.payout.findMany({
    select: {
      numericId: true,
      status: true,
      traderId: true,
      amount: true,
      createdAt: true,
      expireAt: true,
    },
    orderBy: { createdAt: "desc" }
  });
  
  console.log("\nAll payouts:");
  payouts.forEach(p => {
    console.log(`ID: ${p.numericId}, Status: ${p.status}, TraderID: ${p.traderId || 'null'}, Amount: ${p.amount}, Expired: ${new Date(p.expireAt) < new Date()}`);
  });
  
  // Check payouts by status
  const statuses = ['CREATED', 'ACTIVE', 'CHECKING', 'COMPLETED', 'CANCELLED'];
  
  for (const status of statuses) {
    const count = await db.payout.count({
      where: { status: status as any }
    });
    console.log(`\n${status}: ${count} payouts`);
    
    if (count > 0) {
      const examples = await db.payout.findMany({
        where: { status: status as any },
        select: { numericId: true, traderId: true, amount: true },
        take: 3
      });
      examples.forEach(p => {
        console.log(`  - ID ${p.numericId}: ${p.traderId ? 'assigned to trader' : 'available'}, ${p.amount} RUB`);
      });
    }
  }
  
  // Check specifically for the test trader
  const traderPayouts = await db.payout.findMany({
    where: { traderId: trader.id },
    select: { numericId: true, status: true, amount: true }
  });
  
  console.log(`\nPayouts assigned to ${trader.email}:`);
  traderPayouts.forEach(p => {
    console.log(`  - ID ${p.numericId}: ${p.status}, ${p.amount} RUB`);
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());