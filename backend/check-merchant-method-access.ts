import { db } from './src/db';

async function checkMerchantMethodAccess() {
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

  // Check merchant methods
  const merchantMethods = await db.merchantMethod.findMany({
    where: { merchantId: merchant.id },
    include: { method: true }
  });

  console.log('\nMerchant methods:');
  for (const mm of merchantMethods) {
    console.log(`  - ${mm.method.name} (${mm.method.id}) - Enabled: ${mm.isEnabled}`);
  }

  // Check if the specific method exists
  const method = await db.method.findUnique({
    where: { id: 'cmf9zk4ug00quiks4xcytpfb4' }
  });

  if (method) {
    console.log('\nMethod exists:');
    console.log('  ID:', method.id);
    console.log('  Name:', method.name);
    console.log('  Code:', method.code);
    console.log('  Type:', method.type);
  } else {
    console.log('\nMethod not found');
  }

  // Check if merchant has access to this method
  const merchantMethod = await db.merchantMethod.findUnique({
    where: {
      merchantId_methodId: {
        merchantId: merchant.id,
        methodId: 'cmf9zk4ug00quiks4xcytpfb4'
      }
    }
  });

  if (merchantMethod) {
    console.log('\nMerchant has access to method:');
    console.log('  Enabled:', merchantMethod.isEnabled);
  } else {
    console.log('\nMerchant does not have access to this method');
  }
  
  await db.$disconnect();
}

checkMerchantMethodAccess().catch(console.error);
