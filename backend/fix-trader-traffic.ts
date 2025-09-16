import { db } from './src/db';

async function fixTraderTraffic() {
  // Enable traffic for trader with bank details
  const trader = await db.user.findFirst({
    where: {
      email: 'trader@example.com'
    }
  });

  if (trader) {
    await db.user.update({
      where: { id: trader.id },
      data: { trafficEnabled: true }
    });
    console.log('Enabled traffic for trader:', trader.name);
  } else {
    console.log('Trader not found');
  }

  // Also check if trader has access to the merchant
  const merchant = await db.merchant.findFirst({
    where: { token: 'test-merchant-token' }
  });

  if (merchant && trader) {
    // Check if trader has access to the merchant
    const traderMerchant = await db.traderMerchant.findUnique({
      where: {
        traderId_merchantId_methodId: {
          traderId: trader.id,
          merchantId: merchant.id,
          methodId: 'cmf9zk4ug00quiks4xcytpfb4'
        }
      }
    });

    if (!traderMerchant) {
      // Create trader merchant access
      await db.traderMerchant.create({
        data: {
          traderId: trader.id,
          merchantId: merchant.id,
          methodId: 'cmf9zk4ug00quiks4xcytpfb4',
          isMerchantEnabled: true,
          isFeeInEnabled: true,
          isFeeOutEnabled: true,
          feeIn: 0,
          feeOut: 0
        }
      });
      console.log('Created trader merchant access');
    } else {
      console.log('Trader merchant access already exists');
    }
  }
  
  await db.$disconnect();
}

fixTraderTraffic().catch(console.error);
