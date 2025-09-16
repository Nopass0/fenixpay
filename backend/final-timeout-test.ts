import axios from 'axios';

async function finalTimeoutTest() {
  try {
    console.log("🧪 Финальный тест таймаута для domainchsp.ru...");
    
    const testRequest = {
      rate: 82,
      amount: 5009,
      userIp: "127.0.0.1",
      orderId: `FINAL_TEST_${Date.now()}`,
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
        'x-merchant-api-key': '64f8c5b37107d437f778b6037cf4a002d068edd7197108efcd5c53961211bfd0'
      },
      timeout: 15000, // 15 секунд для теста
      validateStatus: () => true // Принимаем любой статус
    });

    const responseTime = Date.now() - startTime;

    console.log("");
    console.log("📥 Ответ получен:");
    console.log(`   Статус: ${response.status}`);
    console.log(`   Время ответа: ${responseTime}ms`);
    console.log(`   Данные:`, JSON.stringify(response.data, null, 2));

    // Анализ результата
    if (responseTime > 2000) {
      console.log("✅ ПРОБЛЕМА РЕШЕНА! Время ответа больше 2000ms, но запрос не таймаутится");
    } else {
      console.log("⚠️  Время ответа все еще меньше 2000ms");
    }

    if (response.status === 200 || response.status === 201) {
      console.log("✅ Запрос успешен!");
    } else if (response.status === 400 && response.data?.error?.includes('timeout')) {
      console.log("❌ Все еще получаем таймаут ошибку");
    } else {
      console.log("⚠️  Запрос завершился с ошибкой, но не таймаутом");
    }

    // Дополнительная информация
    console.log("\n📊 Анализ:");
    console.log(`   Время ответа: ${responseTime}ms`);
    console.log(`   Статус: ${response.status}`);
    console.log(`   Успех: ${response.status === 200 || response.status === 201}`);
    console.log(`   Таймаут ошибка: ${response.data?.error?.includes('timeout') || false}`);

  } catch (error: any) {
    console.error("❌ Ошибка при тестировании:", error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log("⏰ Запрос превысил таймаут (это не должно происходить)");
    } else if (error.response) {
      console.log(`📥 Получен ответ с ошибкой: ${error.response.status}`);
      console.log("📄 Данные ответа:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Запускаем тест
finalTimeoutTest();
