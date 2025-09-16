import axios from 'axios';

async function testErrorSerialization() {
  try {
    console.log("🧪 Тестирование исправления сериализации ошибок...");
    
    const testRequest = {
      rate: 81,
      amount: 5014,
      userIp: "127.0.0.1",
      orderId: `ERROR_TEST_${Date.now()}`,
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
    console.log("\n📊 Анализ ошибки:");
    console.log(`   Статус: ${response.status}`);
    console.log(`   Успех: ${response.data?.success}`);
    console.log(`   Ошибка: ${response.data?.error}`);
    console.log(`   Тип ошибки: ${typeof response.data?.error}`);
    
    if (response.data?.error === "[object Object]") {
      console.log("❌ ПРОБЛЕМА НЕ РЕШЕНА: Все еще получаем '[object Object]'");
    } else if (typeof response.data?.error === 'string' && response.data?.error.length > 0) {
      console.log("✅ ПРОБЛЕМА РЕШЕНА: Ошибка правильно сериализована как строка");
    } else if (typeof response.data?.error === 'object') {
      console.log("⚠️  Ошибка все еще объект, но может быть правильно обработана");
    } else {
      console.log("ℹ️  Ошибка не найдена или имеет неожиданный формат");
    }

    // Проверяем, есть ли другие поля с ошибками
    if (response.data?.message) {
      console.log(`   Сообщение: ${response.data.message}`);
    }
    if (response.data?.details) {
      console.log(`   Детали: ${response.data.details}`);
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
testErrorSerialization();
