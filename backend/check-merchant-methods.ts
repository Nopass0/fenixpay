import { db } from './src/db';

async function checkMerchantMethods() {
  const merchant = await db.merchant.findFirst({
    where: { token: 'test-merchant-token' },
    include: {
      merchantMethods: {
        include: {
          method: true
        }
      }
    }
  });

  if (merchant) {
    console.log('Merchant found:');
    console.log('  ID:', merchant.id);
    console.log('  Name:', merchant.name);
    console.log('  Available methods:');
    
    for (const mm of merchant.merchantMethods) {
      console.log(`    - ${mm.method.name} (${mm.method.id}) - Enabled: ${mm.isEnabled}`);
    }
  } else {
    console.log('Merchant not found');
  }
  
  // Also check all methods
  const allMethods = await db.method.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      type: true
    }
  });
  
  console.log('\nAll available methods:');
  for (const method of allMethods) {
    console.log(`  - ${method.name} (${method.id}) - Code: ${method.code} - Type: ${method.type}`);
  }
  
  await db.$disconnect();
}

checkMerchantMethods().catch(console.error);
