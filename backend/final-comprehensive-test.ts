import axios from 'axios';

async function finalComprehensiveTest() {
  try {
    console.log("🎯 Финальный комплексный тест API...");
    
    const testRequest = {
      rate: 82,
      amount: 5006,
      userIp: "127.0.0.1",
      orderId: `FINAL_COMPREHENSIVE_${Date.now()}`,
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

    // Комплексный анализ результата
    console.log("\n📊 Комплексный анализ:");
    console.log(`   ✅ Время ответа: ${responseTime}ms (${responseTime > 2000 ? 'больше 2000ms' : 'меньше 2000ms'})`);
    console.log(`   ✅ Статус: ${response.status} (${response.status >= 200 && response.status < 300 ? 'успешный' : 'ошибка'})`);
    console.log(`   ✅ Успех: ${response.data?.success !== false ? 'да' : 'нет'}`);
    console.log(`   ✅ Ошибка: ${response.data?.error || 'нет'}`);
    console.log(`   ✅ Тип ошибки: ${typeof response.data?.error}`);
    
    // Проверка на старые проблемы
    if (response.data?.error === "[object Object]") {
      console.log("   ❌ СТАРАЯ ПРОБЛЕМА: Все еще получаем '[object Object]'");
    } else {
      console.log("   ✅ ПРОБЛЕМА РЕШЕНА: Ошибка '[object Object]' больше не появляется");
    }
    
    if (responseTime > 2000 && response.data?.error?.includes('timeout')) {
      console.log("   ❌ СТАРАЯ ПРОБЛЕМА: Все еще получаем таймаут ошибку");
    } else {
      console.log("   ✅ ПРОБЛЕМА РЕШЕНА: Таймаут ошибка больше не появляется");
    }

    // Проверка успешного ответа
    if (response.status === 200 || response.status === 201) {
      console.log("   ✅ УСПЕШНЫЙ ОТВЕТ: Транзакция создана успешно");
      if (response.data?.id) {
        console.log(`   ✅ ID транзакции: ${response.data.id}`);
      }
      if (response.data?.requisites) {
        console.log(`   ✅ Реквизиты: ${JSON.stringify(response.data.requisites)}`);
      }
    } else {
      console.log("   ⚠️  ОТВЕТ С ОШИБКОЙ: Транзакция не создана");
    }

    // Итоговая оценка
    console.log("\n🎯 ИТОГОВАЯ ОЦЕНКА:");
    const hasTimeoutIssue = responseTime > 2000 && response.data?.error?.includes('timeout');
    const hasObjectObjectIssue = response.data?.error === "[object Object]";
    const isSuccessful = response.status >= 200 && response.status < 300;
    
    if (!hasTimeoutIssue && !hasObjectObjectIssue && isSuccessful) {
      console.log("   🎉 ВСЕ ПРОБЛЕМЫ РЕШЕНЫ! API работает корректно");
    } else if (!hasTimeoutIssue && !hasObjectObjectIssue) {
      console.log("   ✅ Основные проблемы решены, но есть другие ошибки");
    } else {
      console.log("   ❌ Некоторые проблемы все еще существуют");
    }

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
finalComprehensiveTest();
