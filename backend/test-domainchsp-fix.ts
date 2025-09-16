import axios from 'axios';

async function testDomainChspFix() {
  try {
    console.log("🧪 Тестирование исправления таймаута для domainchsp.ru...");
    
    const testRequest = {
      rate: 82,
      amount: 5006,
      userIp: "127.0.0.1",
      orderId: `TEST_${Date.now()}`,
      methodId: "cmed74minz06uoc01cjqllr6p",
      expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      callbackUri: "https://chasepay.pro/api/aggregator/callback",
      clientIdentifier: "client_user_12345"
    };

    console.log("📤 Отправляем тестовый запрос:");
    console.log(JSON.stringify(testRequest, null, 2));

    const startTime = Date.now();
    
    const response = await axios.post('https://domainchsp.ru/api/merchant/transactions/in', testRequest, {
      headers: {
        'Content-Type': 'application/json',
        'x-merchant-api-key': '577686bd87567b3ace60fc98158fde4590e34a34643001c691b809d0fd2e51a6'
      },
      timeout: 10000, // 10 секунд для теста
      validateStatus: () => true // Принимаем любой статус
    });

    const responseTime = Date.now() - startTime;

    console.log("");
    console.log("📥 Ответ получен:");
    console.log(`   Статус: ${response.status}`);
    console.log(`   Время ответа: ${responseTime}ms`);
    console.log(`   Данные:`, JSON.stringify(response.data, null, 2));

    if (responseTime > 2000) {
      console.log("✅ Проблема решена! Время ответа больше 2000ms, но запрос не таймаутится");
    } else {
      console.log("⚠️  Время ответа все еще меньше 2000ms");
    }

    if (response.status === 200 || response.status === 201) {
      console.log("✅ Запрос успешен!");
    } else {
      console.log("❌ Запрос завершился с ошибкой");
    }

  } catch (error: any) {
    console.error("❌ Ошибка при тестировании:", error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log("⏰ Запрос превысил таймаут");
    } else if (error.response) {
      console.log(`📥 Получен ответ с ошибкой: ${error.response.status}`);
      console.log("📄 Данные ответа:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Запускаем тест
testDomainChspFix();
