import axios from 'axios';

async function testChaseDirect() {
  const endpoint = 'https://chasepay.pro/api/merchant/transactions/in';
  const apiKey = 'b00607ffee5f95a41906214e87aa282f8de37289a9e2a537a16821a2f2729bc4';

  const orderId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const requestData = {
    rate: 99.84732116999834,
    amount: 6650,
    isMock: false,
    orderId: orderId,
    methodId: "cmdem3ozl013fqn011c0b154s", // Правильный methodId из вашего примера
    expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    callbackUri: "https://example.com/callback",
    userIp: "115.112.86.248",
    clientIdentifier: "client_user_12345"
  };

  console.log("=== ТЕСТИРОВАНИЕ ПРЯМОГО ЗАПРОСА К CHASE ===\n");
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
    console.log("\nТело ответа:");
    console.log(JSON.stringify(response.data, null, 2));

    if (response.status === 201 && response.data.id) {
      console.log("\n✅ УСПЕШНЫЙ ОТВЕТ!");
      console.log(`   Transaction ID: ${response.data.id}`);
      if (response.data.requisites) {
        console.log("   Реквизиты получены!");
      }
    } else if (response.data.error) {
      console.log("\n❌ ОШИБКА!");
      console.log(`   Ошибка: ${response.data.error}`);
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

testChaseDirect().catch(console.error);