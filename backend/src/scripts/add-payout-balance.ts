import { db } from "../db";

async function addPayoutBalance() {
  try {
    // Find the test trader
    const trader = await db.user.findFirst({
      where: {
        email: "payout-trader@test.com"
      }
    });
    
    if (!trader) {
      console.error("Test trader not found!");
      return;
    }
    
    // Add payout balance
    const updatedTrader = await db.user.update({
      where: { id: trader.id },
      data: {
        payoutBalance: 1000000, // 1 million RUB
        maxSimultaneousPayouts: 10 // Allow 10 simultaneous payouts
      }
    });
    
    console.log(`Updated trader ${updatedTrader.email}:`);
    console.log(`  Payout balance: ${updatedTrader.payoutBalance} RUB`);
    console.log(`  Max simultaneous payouts: ${updatedTrader.maxSimultaneousPayouts}`);
    
  } catch (error) {
    console.error("Error adding payout balance:", error);
  } finally {
    await db.$disconnect();
  }
}

addPayoutBalance();