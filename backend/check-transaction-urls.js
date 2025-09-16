const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkTransaction() {
  const orderId = 'ADMIN_IN_1757930774922_po2nq4';
  
  console.log(`\n=== Checking Transaction URLs for orderId: ${orderId} ===\n`);
  
  const transaction = await db.transaction.findFirst({
    where: { orderId },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          apiKeyPublic: true
        }
      }
    }
  });
  
  if (!transaction) {
    console.log('Transaction not found!');
    return;
  }
  
  console.log('Transaction found:');
  console.log('- ID:', transaction.id);
  console.log('- Order ID:', transaction.orderId);
  console.log('- Status:', transaction.status);
  console.log('- Amount:', transaction.amount);
  console.log('- Merchant ID:', transaction.merchantId);
  console.log('- Merchant Name:', transaction.merchant?.name);
  console.log('\nCallback URLs:');
  console.log('- Success URI:', transaction.successUri || '(not set)');
  console.log('- Fail URI:', transaction.failUri || '(not set)');
  console.log('- Callback URI:', transaction.callbackUri || '(not set)');
  
  if (!transaction.callbackUri && !transaction.successUri && !transaction.failUri) {
    console.log('\n⚠️  WARNING: No callback URLs are set for this transaction!');
    console.log('This is why merchant callbacks are not being sent.');
    
    // Let's update it with a test URL
    console.log('\nUpdating transaction with test callback URL...');
    
    const updated = await db.transaction.update({
      where: { id: transaction.id },
      data: {
        callbackUri: 'https://webhook.site/unique-id-here', // Replace with your webhook.site URL
        successUri: 'https://webhook.site/unique-id-here/success',
        failUri: 'https://webhook.site/unique-id-here/fail'
      }
    });
    
    console.log('✅ Transaction updated with test callback URLs');
    console.log('Now when you send a callback, it should forward to the merchant!');
  } else {
    console.log('\n✅ Transaction has callback URLs configured');
  }
  
  await db.$disconnect();
}

checkTransaction();