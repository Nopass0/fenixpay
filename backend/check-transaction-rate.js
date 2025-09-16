const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTransactionRate() {
  try {
    // Найдем последнюю транзакцию с агрегатором
    const transaction = await prisma.transaction.findFirst({
      where: {
        aggregatorId: { not: null },
        OR: [
          { orderId: { contains: 'TEST_AGGREGATOR_RATE' } },
          { orderId: { contains: 'TEST_RATE_DEBUG' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        aggregator: {
          select: { id: true, name: true }
        }
      }
    });

    if (transaction) {
      console.log('Найденная транзакция:');
      console.log('ID:', transaction.id);
      console.log('Order ID:', transaction.orderId);
      console.log('Amount:', transaction.amount);
      console.log('Rate:', transaction.rate);
      console.log('Merchant Rate:', transaction.merchantRate);
      console.log('Aggregator ID:', transaction.aggregatorId);
      console.log('Aggregator Name:', transaction.aggregator?.name);
      console.log('Created At:', transaction.createdAt);
      
      // Проверим источник курса агрегатора
      if (transaction.aggregatorId) {
        const rateSource = await prisma.aggregatorRateSource.findUnique({
          where: { aggregatorId: transaction.aggregatorId },
          include: { rateSource: true }
        });
        
        if (rateSource) {
          console.log('\nИсточник курса агрегатора:');
          console.log('Source:', rateSource.rateSource?.source);
          console.log('Base Rate:', rateSource.rateSource?.baseRate);
          console.log('KKK Percent:', rateSource.kkkPercent);
          console.log('KKK Operation:', rateSource.kkkOperation);
        } else {
          console.log('\nИсточник курса не настроен для этого агрегатора');
        }
      }
    } else {
      console.log('Транзакция с агрегатором не найдена');
    }
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransactionRate();
