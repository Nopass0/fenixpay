import { db } from './src/db';

async function createC2CRequisites() {
  const trader = await db.user.findFirst({
    where: {
      email: 'trader@example.com'
    }
  });

  if (!trader) {
    console.log('Trader not found');
    return;
  }

  // Create C2C bank details
  const bankDetail = await db.bankDetail.create({
    data: {
      userId: trader.id,
      methodType: 'c2c',
      bankName: 'Test Bank',
      cardNumber: '1234567890123456',
      recipientName: 'Test Recipient',
      minAmount: 100,
      maxAmount: 100000,
      operationLimit: 10,
      sumLimit: 500000,
      intervalMinutes: 0,
      isActive: true,
      isArchived: false
    }
  });

  console.log('Created C2C bank details:');
  console.log('  ID:', bankDetail.id);
  console.log('  Method:', bankDetail.methodType);
  console.log('  Card:', bankDetail.cardNumber);
  console.log('  Amount range:', bankDetail.minAmount, '-', bankDetail.maxAmount);
  
  await db.$disconnect();
}

createC2CRequisites().catch(console.error);
