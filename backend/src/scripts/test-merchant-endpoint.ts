import axios from 'axios';

async function testMerchantEndpoint() {
  const endpoint = 'http://localhost:3000/api/merchant/transactions/in';
  const apiKey = 'test-merchant-token';

  const orderId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const requestData = {
    rate: 84,
    amount: 6950,
    isMock: false,
    orderId: orderId,
    methodId: "cmdrc7j3b0004toztxn8l7kl0", // Our C2C method - will be mapped to Chase methodId
    expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    callbackUri: "http://localhost:3000/api/aggregator/callback"
  };

  console.log("=== ТЕСТИРОВАНИЕ MERCHANT ENDPOINT ===\n");
  console.log("Endpoint:", endpoint);
  console.log("Order ID:", orderId);
  console.log("Request Data:", JSON.stringify(requestData, null, 2));
  console.log("\nОтправка запроса...\n");

  try {
    const startTime = Date.now();

    const response = await axios.post(endpoint, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'x-merchant-api-key': apiKey
      },
      timeout: 10000, // 10 seconds timeout
      validateStatus: () => true // Accept any status code
    });

    const responseTime = Date.now() - startTime;

    console.log("=== ОТВЕТ ===");
    console.log(`Статус: ${response.status}`);
    console.log(`Время ответа: ${responseTime}ms`);
    console.log(`Заголовки ответа:`, response.headers);
    console.log("\nТело ответа:");
    console.log(JSON.stringify(response.data, null, 2));

    // Анализ ответа
    if (response.status === 200 || response.status === 201) {
      console.log("\n✅ УСПЕШНЫЙ ОТВЕТ!");

      if (response.data.id) {
        console.log(`   Transaction ID: ${response.data.id}`);
      }

      if (response.data.requisites) {
        console.log("   Реквизиты получены:");
        console.log(`     - Банк: ${response.data.requisites.bankType || 'N/A'}`);
        console.log(`     - Карта: ${response.data.requisites.cardNumber || 'N/A'}`);
        console.log(`     - Получатель: ${response.data.requisites.recipientName || 'N/A'}`);
      } else {
        console.log("   ⚠️  Реквизиты не получены");
      }

      if (response.data.traderId) {
        console.log(`   Trader/Aggregator ID: ${response.data.traderId}`);
      }
    } else if (response.status === 409 && response.data.error === 'NO_REQUISITE') {
      console.log("\n⚠️  NO_REQUISITE - нет доступных реквизитов");
      console.log("   Возможные причины:");
      console.log("   1. Нет активных трейдеров");
      console.log("   2. Агрегатор недоступен или не настроен");
      console.log("   3. Агрегатор не возвращает реквизиты");
    } else {
      console.log("\n❌ ОШИБКА!");
      if (response.data.error) {
        console.log(`   Ошибка: ${response.data.error}`);
      }
      if (response.data.message) {
        console.log(`   Сообщение: ${response.data.message}`);
      }
    }

  } catch (error: any) {
    console.log("\n❌ ОШИБКА ЗАПРОСА!");

    if (error.code === 'ECONNABORTED') {
      console.log("   Превышен таймаут запроса");
    } else if (error.response) {
      console.log(`   HTTP статус: ${error.response.status}`);
      console.log(`   Ответ: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.log("   Запрос отправлен, но ответ не получен");
      console.log(`   Детали: ${error.message}`);
    } else {
      console.log(`   Ошибка: ${error.message}`);
    }
  }
}

testMerchantEndpoint().catch(console.error);