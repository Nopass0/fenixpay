import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function checkMerchantAggregators() {
  try {
    console.log('🔍 Проверяем мерчанта 123...');
    
    // Найдем мерчанта 123
    const merchant = await db.merchant.findFirst({
      where: { name: '123' },
      select: { id: true, name: true }
    });
    
    if (!merchant) {
      console.log('❌ Мерчант 123 не найден');
      return;
    }
    
    console.log('✅ Мерчант найден:', merchant);
    
    // Проверим агрегаторы мерчанта
    const aggregators = await db.aggregatorMerchant.findMany({
      where: { 
        merchantId: merchant.id,
        isActive: true
      },
      include: {
        aggregator: {
          select: { id: true, name: true }
        }
      }
    });
    
    console.log('📊 Агрегаторы мерчанта:', aggregators);
    
    // Проверим последние транзакции
    const transactions = await db.transaction.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        amount: true,
        rate: true,
        aggregatorId: true,
        createdAt: true
      }
    });
    
    console.log('💰 Последние транзакции:', transactions);
    
    // Проверим источники курсов
    const rateSources = await db.rateSourceConfig.findMany({
      where: { isActive: true },
      select: { source: true, displayName: true, baseRate: true }
    });
    
    console.log('📈 Источники курсов:', rateSources);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await db.$disconnect();
  }
}

checkMerchantAggregators();
