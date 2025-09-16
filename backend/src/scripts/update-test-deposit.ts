import { db } from "@/db";

async function updateTestDeposit() {
  console.log("=== Updating Test Deposit ===");

  // Get wallet address from config
  const walletConfig = await db.systemConfig.findUnique({
    where: { key: "deposit_wallet_address" }
  });

  if (!walletConfig) {
    console.log("Wallet address not configured");
    return;
  }

  console.log(`Wallet address: ${walletConfig.value}`);

  // Update the last created deposit
  const lastDeposit = await db.depositRequest.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { trader: true }
  });

  if (!lastDeposit) {
    console.log("No deposits found");
    return;
  }

  // Update deposit with correct address
  const updated = await db.depositRequest.update({
    where: { id: lastDeposit.id },
    data: { address: walletConfig.value }
  });

  console.log(`Updated deposit ${updated.id} with address ${updated.address}`);
}

updateTestDeposit()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());