// Тестируем окончательное исправление methodId

async function testFinalMethodIdFix() {
  try {
    console.log(
      "🧪 Тестируем окончательное исправление methodId после перезапуска сервера...\n"
    );

    const response = await fetch(
      "http://localhost:3000/api/merchant/transactions/in",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-merchant-api-key":
            "b00607ffee5f95a41906214e87aa282f8de37289a9e2a537a16821a2f2729bc4",
        },
        body: JSON.stringify({
          orderId: `test_order_${Date.now()}`,
          rate: 84,
          amount: 5000,
          methodId: "cmfjsx514040otozcsg3tum7x",
          expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          isMock: false,
        }),
      }
    );

    const data = await response.json();

    console.log("📊 Результат запроса:");
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (response.status === 200 || response.status === 201) {
      console.log("\n✅ Сделка успешно создана!");
      if (data.requisites) {
        console.log("📋 Реквизиты получены:", data.requisites);
      }
    } else if (data.error === "NO_REQUISITE") {
      console.log(
        "\n✅ Система работает правильно - агрегатор не имеет доступных реквизитов"
      );
    } else if (data.error === "methodId is not defined") {
      console.log(
        "\n❌ Ошибка methodId все еще присутствует - сервер не перезапустился с изменениями"
      );
    } else {
      console.log("\n❌ Ошибка при создании сделки:", data.error);
    }
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  }
}

testFinalMethodIdFix();
