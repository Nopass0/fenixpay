import { db } from './src/db';

async function giveMerchantMethodAccess() {
  const merchant = await db.merchant.findFirst({
    where: { token: 'test-merchant-token' }
  });

  if (!merchant) {
    console.log('Merchant not found');
    return;
  }

  console.log('Merchant found:');
  console.log('  ID:', merchant.id);
  console.log('  Name:', merchant.name);

  // Give access to the method
  const merchantMethod = await db.merchantMethod.create({
    data: {
      merchantId: merchant.id,
      methodId: 'cmf9zk4ug00quiks4xcytpfb4',
      isEnabled: true
    }
  });

  console.log('Merchant method access created:');
  console.log('  ID:', merchantMethod.id);
  console.log('  Enabled:', merchantMethod.isEnabled);

  // Also give access to SBP method
  const sbpMethod = await db.merchantMethod.create({
    data: {
      merchantId: merchant.id,
      methodId: 'cmf9y824y08spikmk4k0rcqs6',
      isEnabled: true
    }
  });

  console.log('SBP method access created:');
  console.log('  ID:', sbpMethod.id);
  console.log('  Enabled:', sbpMethod.isEnabled);
  
  await db.$disconnect();
}

giveMerchantMethodAccess().catch(console.error);
