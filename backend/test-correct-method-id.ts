import { db } from './src/db';
import { aggregatorQueueService } from './src/services/aggregator-queue.service';

async function testCorrectMethodId() {
  try {
    console.log('=== ТЕСТИРОВАНИЕ С ПРАВИЛЬНЫМ METHOD ID ===\n');
    
    // Используем правильный methodId из базы данных
    const correctMethodId = 'cmf9y824y08spikmk4k0rcqs6'; // sbp1
    
    // Создаем тестовый запрос с правильным methodId
    const testRequest = {
      ourDealId: 'TEST_CORRECT_METHOD_' + Date.now(),
      amount: 1000,
      rate: 82,
      paymentMethod: 'SBP' as const,
      clientIdentifier: 'client_user_12345',
      callbackUrl: 'https://chasepay.pro/api/aggregator/callback',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      metadata: {
        userIp: '127.0.0.1',
        methodId: correctMethodId, // Используем правильный methodId
        methodType: 'sbp'
      },
      merchantId: 'cmf9xmoss010oikmkmjf2ungz'
    };
    
    console.log('Тестовый запрос с правильным methodId:');
    console.log('Method ID:', correctMethodId);
    console.log('Запрос:', JSON.stringify(testRequest, null, 2));
    
    // Отправляем запрос через систему
    console.log('\nОтправляем запрос через AggregatorQueueService...');
    const result = await aggregatorQueueService.routeDealToAggregators(testRequest, 0);
    
    console.log('\nРезультат:');
    console.log('Успех:', result.success);
    console.log('Агрегатор:', result.aggregator?.name);
    console.log('Ответ:', JSON.stringify(result.response, null, 2));
    console.log('Попробованные агрегаторы:', result.triedAggregators);
    
    if (result.success) {
      console.log('\n✅ УСПЕХ! Запрос прошел успешно');
    } else {
      console.log('\n❌ ОШИБКА: Запрос не прошел');
      
      // Проверяем логи для деталей
      const logs = await db.aggregatorIntegrationLog.findMany({
        where: {
          ourDealId: testRequest.ourDealId
        },
        orderBy: { createdAt: 'desc' },
        take: 3
      });
      
      if (logs.length > 0) {
        console.log('\nЛоги ошибок:');
        logs.forEach((log, index) => {
          console.log(`\n--- Лог ${index + 1} ---`);
          console.log('Время:', log.createdAt);
          console.log('URL:', log.url);
          console.log('Статус:', log.statusCode);
          console.log('Ошибка:', log.error);
          console.log('Ответ:', JSON.stringify(log.responseBody, null, 2));
        });
      }
    }
    
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  } finally {
    await db.$disconnect();
  }
}

testCorrectMethodId();
