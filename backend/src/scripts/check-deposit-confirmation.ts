import { db } from "@/db";
import { DepositStatus, DepositType } from "@prisma/client";

async function checkDepositConfirmation() {
  console.log("=== Checking Deposit Confirmation ===");

  // Get a pending deposit
  const pendingDeposit = await db.depositRequest.findFirst({
    where: { 
      status: { in: [DepositStatus.PENDING, DepositStatus.CHECKING] }
    },
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
    }
  });

  if (!pendingDeposit) {
    console.log("No pending deposits found");
    return;
  }

  console.log("\nPending deposit found:");
  console.log(`ID: ${pendingDeposit.id}`);
  console.log(`Type: ${pendingDeposit.type}`);
  console.log(`Amount: ${pendingDeposit.amountUSDT} USDT`);
  console.log(`Trader: ${pendingDeposit.trader.email}`);
  console.log(`Current trader deposit balance: ${pendingDeposit.trader.deposit}`);
  console.log(`Current trader trust balance: ${pendingDeposit.trader.trustBalance}`);

  // Simulate confirmation
  console.log("\nSimulating deposit confirmation...");

  await db.$transaction(async (prisma) => {
    // Update deposit status
    await prisma.depositRequest.update({
      where: { id: pendingDeposit.id },
      data: {
        status: DepositStatus.CONFIRMED,
        confirmations: 3,
        confirmedAt: new Date(),
        processedAt: new Date()
      }
    });

    // Update trader balance
    const balanceUpdate = pendingDeposit.type === DepositType.INSURANCE
      ? { deposit: { increment: pendingDeposit.amountUSDT } }
      : { trustBalance: { increment: pendingDeposit.amountUSDT } };

    console.log("Balance update:", balanceUpdate);

    const updatedUser = await prisma.user.update({
      where: { id: pendingDeposit.traderId },
      data: balanceUpdate,
      select: {
        id: true,
        email: true,
        deposit: true,
        trustBalance: true
      }
    });

    console.log("\nUpdated trader balances:");
    console.log(`Deposit balance: ${updatedUser.deposit}`);
    console.log(`Trust balance: ${updatedUser.trustBalance}`);
  });

  console.log("\nDeposit confirmation test completed!");
}

checkDepositConfirmation()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());