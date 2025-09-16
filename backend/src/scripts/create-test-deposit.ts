import { db } from "@/db";
import { DepositStatus, DepositType } from "@prisma/client";

async function createTestDeposit() {
  console.log("=== Creating Test Deposit ===");

  // Find trader
  const trader = await db.user.findFirst({
    where: { email: "trader@test.com" }
  });

  if (!trader) {
    console.log("Trader not found");
    return;
  }

  console.log(`Found trader: ${trader.email}`);
  console.log(`Current deposit balance: ${trader.deposit}`);
  console.log(`Current trust balance: ${trader.trustBalance}`);

  // Create a new INSURANCE deposit
  const deposit = await db.depositRequest.create({
    data: {
      traderId: trader.id,
      amountUSDT: 100,
      address: "TRX123456789",
      status: DepositStatus.PENDING,
      type: DepositType.INSURANCE,
      txHash: "test-tx-hash-123"
    }
  });

  console.log(`\nCreated deposit: ${deposit.id}`);
  console.log(`Type: ${deposit.type}`);
  console.log(`Amount: ${deposit.amountUSDT} USDT`);
  console.log(`Status: ${deposit.status}`);
}

createTestDeposit()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());