import { db } from './src/db';

async function checkMerchant() {
  const merchant = await db.merchant.findFirst({
    where: {
      OR: [
        { token: 'ea8b99acf105a149df8860b93f4c8c46cb2cab04bcb3d1c5166659e9617b8ce6' },
        { apiKeyPublic: 'ea8b99acf105a149df8860b93f4c8c46cb2cab04bcb3d1c5166659e9617b8ce6' }
      ]
    }
  });

  if (merchant) {
    console.log('Merchant found:');
    console.log('  ID:', merchant.id);
    console.log('  Name:', merchant.name);
    console.log('  Token:', merchant.token);
    console.log('  Public Key:', merchant.apiKeyPublic);
    console.log('  Disabled:', merchant.disabled);
  } else {
    console.log('Merchant not found');
  }
  
  await db.$disconnect();
}

checkMerchant().catch(console.error);
