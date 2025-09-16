import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function testApiEndpoint() {
  console.log('🧪 Тестирование API endpoint для установки одинакового токена...');
  
  try {
    // Создаем тестовых агрегаторов
    const aggregator1 = await db.aggregator.create({
      data: {
        email: `api-test1-${Date.now()}@example.com`,
        password: 'test123',
        name: 'API Test Aggregator 1',
        apiToken: `api-token-1-${Date.now()}`,
        callbackToken: `callback-token-1-${Date.now()}`,
      }
    });
    
    const aggregator2 = await db.aggregator.create({
      data: {
        email: `api-test2-${Date.now()}@example.com`,
        password: 'test123',
        name: 'API Test Aggregator 2',
        apiToken: `api-token-2-${Date.now()}`,
        callbackToken: `callback-token-2-${Date.now()}`,
      }
    });
    
    console.log('✅ Созданы тестовые агрегаторы для API тестирования');
    
    // Получаем admin key (предполагаем, что он есть в базе)
    const admin = await db.admin.findFirst();
    if (!admin) {
      console.log('❌ Админ не найден в базе данных');
      return;
    }
    
    const adminKey = admin.key;
    const sharedToken = `api-shared-token-${Date.now()}`;
    
    console.log('🔄 Тестируем API endpoint для первого агрегатора...');
    
    // Тестируем первый агрегатор
    const response1 = await fetch(`http://localhost:3000/api/admin/aggregators/${aggregator1.id}/custom-token`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({
        customApiToken: sharedToken
      })
    });
    
    if (response1.ok) {
      console.log('✅ Первый агрегатор: токен установлен успешно');
    } else {
      const error1 = await response1.text();
      console.log('❌ Первый агрегатор: ошибка', response1.status, error1);
    }
    
    console.log('🔄 Тестируем API endpoint для второго агрегатора...');
    
    // Тестируем второй агрегатор
    const response2 = await fetch(`http://localhost:3000/api/admin/aggregators/${aggregator2.id}/custom-token`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({
        customApiToken: sharedToken
      })
    });
    
    if (response2.ok) {
      console.log('✅ Второй агрегатор: токен установлен успешно');
      console.log('🎉 API ТЕСТ ПРОЙДЕН: Один токен успешно установлен для разных агрегаторов через API!');
    } else {
      const error2 = await response2.text();
      console.log('❌ Второй агрегатор: ошибка', response2.status, error2);
    }
    
    // Очищаем тестовые данные
    await db.aggregator.deleteMany({
      where: {
        id: { in: [aggregator1.id, aggregator2.id] }
      }
    });
    
    console.log('🧹 Тестовые данные очищены');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error);
  } finally {
    await db.$disconnect();
  }
}

testApiEndpoint();
