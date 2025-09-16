import { db } from './src/db';

async function checkTraderRequisites() {
  const trader = await db.user.findFirst({
    where: {
      email: 'trader@example.com'
    },
    include: {
      bankDetails: {
        where: {
          isArchived: false,
          isActive: true
        }
      }
    }
  });

  if (trader) {
    console.log('Trader found:');
    console.log('  ID:', trader.id);
    console.log('  Name:', trader.name);
    console.log('  Traffic enabled:', trader.trafficEnabled);
    console.log('  Bank details:', trader.bankDetails.length);
    
    for (const bd of trader.bankDetails) {
      console.log(`    - ${bd.methodType}: ${bd.minAmount}-${bd.maxAmount}`);
    }
  } else {
    console.log('Trader not found');
  }

  // Check if there are any bank details for c2c method
  const c2cBankDetails = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      isActive: true,
      methodType: 'c2c',
      user: {
        banned: false,
        trafficEnabled: true
      }
    },
    include: {
      user: true
    }
  });

  console.log('\nC2C bank details available:', c2cBankDetails.length);
  for (const bd of c2cBankDetails) {
    console.log(`  - ${bd.user.name}: ${bd.minAmount}-${bd.maxAmount}`);
  }
  
  await db.$disconnect();
}

checkTraderRequisites().catch(console.error);
