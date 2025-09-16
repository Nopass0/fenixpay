import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function testCustomTokenSharing() {
  console.log('🧪 Тестирование возможности использования одного токена для разных агрегаторов...');
  
  try {
    // Создаем тестовых агрегаторов
    const aggregator1 = await db.aggregator.create({
      data: {
        email: `test1-${Date.now()}@example.com`,
        password: 'test123',
        name: 'Test Aggregator 1',
        apiToken: `api-token-1-${Date.now()}`,
        callbackToken: `callback-token-1-${Date.now()}`,
      }
    });
    
    const aggregator2 = await db.aggregator.create({
      data: {
        email: `test2-${Date.now()}@example.com`,
        password: 'test123',
        name: 'Test Aggregator 2',
        apiToken: `api-token-2-${Date.now()}`,
        callbackToken: `callback-token-2-${Date.now()}`,
      }
    });
    
    console.log('✅ Созданы тестовые агрегаторы:', { 
      id1: aggregator1.id, 
      id2: aggregator2.id 
    });
    
    // Пробуем установить один и тот же customApiToken для обоих агрегаторов
    const sharedToken = `shared-token-${Date.now()}`;
    
    console.log('🔄 Устанавливаем одинаковый токен для первого агрегатора...');
    const updated1 = await db.aggregator.update({
      where: { id: aggregator1.id },
      data: { customApiToken: sharedToken }
    });
    
    console.log('🔄 Устанавливаем тот же токен для второго агрегатора...');
    const updated2 = await db.aggregator.update({
      where: { id: aggregator2.id },
      data: { customApiToken: sharedToken }
    });
    
    console.log('✅ Успешно! Оба агрегатора используют один токен:');
    console.log(`   Агрегатор 1 (${updated1.id}): ${updated1.customApiToken}`);
    console.log(`   Агрегатор 2 (${updated2.id}): ${updated2.customApiToken}`);
    
    // Проверяем, что токены действительно одинаковые
    if (updated1.customApiToken === updated2.customApiToken && updated1.customApiToken === sharedToken) {
      console.log('🎉 ТЕСТ ПРОЙДЕН: Один токен успешно используется несколькими агрегаторами!');
    } else {
      console.log('❌ ТЕСТ НЕ ПРОЙДЕН: Токены не совпадают');
    }
    
    // Очищаем тестовые данные
    await db.aggregator.deleteMany({
      where: {
        id: { in: [aggregator1.id, aggregator2.id] }
      }
    });
    
    console.log('🧹 Тестовые данные очищены');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await db.$disconnect();
  }
}

testCustomTokenSharing();
