import { db } from "@/db";

async function listAllDeposits() {
  console.log("=== All Deposits ===");

  const deposits = await db.depositRequest.findMany({
    include: { 
      trader: {
        select: {
          id: true,
          email: true,
          name: true,
          deposit: true,
          trustBalance: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log(`Found ${deposits.length} deposits\n`);

  for (const deposit of deposits) {
    console.log(`ID: ${deposit.id}`);
    console.log(`Type: ${deposit.type}`);
    console.log(`Amount: ${deposit.amountUSDT} USDT`);
    console.log(`Status: ${deposit.status}`);
    console.log(`Trader: ${deposit.trader.email}`);
    console.log(`Trader deposit balance: ${deposit.trader.deposit}`);
    console.log(`Trader trust balance: ${deposit.trader.trustBalance}`);
    console.log(`Created: ${deposit.createdAt}`);
    console.log(`Confirmed: ${deposit.confirmedAt || 'Not confirmed'}`);
    console.log(`TxHash: ${deposit.txHash || 'None'}`);
    console.log("---");
  }
}

listAllDeposits()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());