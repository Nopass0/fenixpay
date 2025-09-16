import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupUser1() {
  try {
    // Find user with numericId 1
    const user = await prisma.user.findUnique({
      where: { numericId: 1 }
    });

    if (!user) {
      console.log('User with numericId 1 not found');
      return;
    }

    console.log(`Cleaning up data for user: ${user.email}`);
    const userId = user.id;

    // Delete all transactions where this user is the trader
    const deletedTransactions = await prisma.transaction.deleteMany({
      where: { traderId: userId }
    });
    console.log(`Deleted ${deletedTransactions.count} transactions`);

    // Delete all bank details (requisites)
    const deletedRequisites = await prisma.bankDetail.deleteMany({
      where: { userId }
    });
    console.log(`Deleted ${deletedRequisites.count} requisites`);

    // Delete all devices
    const deletedDevices = await prisma.device.deleteMany({
      where: { userId }
    });
    console.log(`Deleted ${deletedDevices.count} devices`);

    // Update user balances to 0
    await prisma.user.update({
      where: { id: userId },
      data: {
        balanceRub: 0,
        balanceUsdt: 0,
        frozenRub: 0,
        frozenUsdt: 0,
        deposit: 0,
        profitFromDeals: 0,
        profitFromPayouts: 0,
        payoutBalance: 0,
        trustBalance: 0,
        frozenPayoutBalance: 0
      }
    });
    console.log('Reset all balances and totals to 0');

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupUser1();