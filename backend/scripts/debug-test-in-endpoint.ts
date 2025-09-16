import { db } from "../src/db";

async function debugTestInEndpoint() {
  console.log("=== Отладка эндпоинта /test/in ===\n");

  // Параметры из вашего запроса
  const requestData = {
    methodId: "cmdhsk1dm015zikbmjw9bi8x1",
    amount: 4071,
    orderId: "BATCH_IN_1753441976381_4_c0yl6b",
    expired_at: "2025-07-25T12:12:56.381Z",
    userIp: "192.168.30.177",
    rate: 101.70252088247095
  };

  console.log("Параметры запроса:");
  console.log(JSON.stringify(requestData, null, 2));

  // 1. Проверяем мерчанта
  const testMerchant = await db.merchant.findFirst({
    where: { name: 'test' }
  });

  console.log(`\nМерчант 'test': ${testMerchant ? 'Найден' : 'НЕ НАЙДЕН'}`);

  // 2. Проверяем метод
  const method = await db.method.findUnique({
    where: { id: requestData.methodId }
  });

  console.log(`\nМетод ${requestData.methodId}: ${method ? `${method.name} (type='${method.type}')` : 'НЕ НАЙДЕН'}`);

  if (!method) {
    process.exit(1);
  }

  // 3. Выполняем поиск реквизитов как в эндпоинте
  console.log("\n=== Поиск реквизитов (как в эндпоинте) ===");
  console.log("Условия поиска:");
  console.log(`  - isArchived: false`);
  console.log(`  - methodType: '${method.type}'`);
  console.log(`  - user.banned: false`);
  console.log(`  - user.deposit >= 1000`);
  console.log(`  - user.trafficEnabled: true`);
  console.log(`  - Устройство: БТ или (isOnline=true И isWorking=true)`);

  const pool = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      methodType: method.type,
      user: { 
        banned: false,
        deposit: { gte: 1000 },
        trafficEnabled: true
      },
      OR: [
        { deviceId: null },
        { device: { isWorking: true, isOnline: true } }
      ]
    },
    orderBy: { updatedAt: "asc" },
    include: { user: true, device: true }
  });

  console.log(`\nНайдено реквизитов: ${pool.length}`);

  // 4. Проверяем каждый реквизит
  let chosen = null;
  for (let i = 0; i < pool.length; i++) {
    const bd = pool[i];
    console.log(`\nРеквизит ${i + 1}: ${bd.bankType} ${bd.cardNumber}`);
    console.log(`  Пользователь: ${bd.user.email}`);
    console.log(`  Лимиты реквизита: ${bd.minAmount}-${bd.maxAmount}`);
    console.log(`  Лимиты трейдера: ${bd.user.minAmountPerRequisite}-${bd.user.maxAmountPerRequisite}`);
    
    const checkMinReq = requestData.amount >= bd.minAmount;
    const checkMaxReq = requestData.amount <= bd.maxAmount;
    const checkMinTrader = requestData.amount >= bd.user.minAmountPerRequisite;
    const checkMaxTrader = requestData.amount <= bd.user.maxAmountPerRequisite;
    
    console.log(`  Проверка суммы ${requestData.amount}:`);
    console.log(`    >= ${bd.minAmount} (реквизит min): ${checkMinReq ? '✓' : '✗'}`);
    console.log(`    <= ${bd.maxAmount} (реквизит max): ${checkMaxReq ? '✓' : '✗'}`);
    console.log(`    >= ${bd.user.minAmountPerRequisite} (трейдер min): ${checkMinTrader ? '✓' : '✗'}`);
    console.log(`    <= ${bd.user.maxAmountPerRequisite} (трейдер max): ${checkMaxTrader ? '✓' : '✗'}`);
    
    if (requestData.amount < bd.minAmount || requestData.amount > bd.maxAmount) {
      console.log(`  ❌ Сумма вне лимитов реквизита`);
      continue;
    }
    if (requestData.amount < bd.user.minAmountPerRequisite || requestData.amount > bd.user.maxAmountPerRequisite) {
      console.log(`  ❌ Сумма вне лимитов трейдера`);
      continue;
    }
    
    chosen = bd;
    console.log(`  ✅ Реквизит подходит!`);
    break;
  }

  console.log(`\n\nРезультат: ${chosen ? 'Реквизит найден' : 'NO_REQUISITE'}`);

  // 5. Если не найден, проверяем почему
  if (!chosen && pool.length === 0) {
    console.log("\n=== Диагностика: почему не найдены реквизиты ===");
    
    // Проверяем все SBP реквизиты
    const allSbp = await db.bankDetail.findMany({
      where: { methodType: method.type },
      include: { user: true, device: true }
    });
    
    console.log(`\nВсего SBP реквизитов в базе: ${allSbp.length}`);
    
    for (const bd of allSbp) {
      console.log(`\nРеквизит ${bd.id}:`);
      console.log(`  Пользователь: ${bd.user.email}`);
      console.log(`  isArchived: ${bd.isArchived}`);
      console.log(`  user.banned: ${bd.user.banned}`);
      console.log(`  user.deposit: ${bd.user.deposit}`);
      console.log(`  user.trafficEnabled: ${bd.user.trafficEnabled}`);
      if (bd.device) {
        console.log(`  device.isOnline: ${bd.device.isOnline}`);
        console.log(`  device.isWorking: ${bd.device.isWorking}`);
      } else {
        console.log(`  device: БТ (null)`);
      }
      
      // Проверяем каждое условие
      const checks = {
        "isArchived = false": !bd.isArchived,
        "user.banned = false": !bd.user.banned,
        "user.deposit >= 1000": bd.user.deposit >= 1000,
        "user.trafficEnabled = true": bd.user.trafficEnabled,
        "device OK": !bd.deviceId || (bd.device && bd.device.isOnline && bd.device.isWorking)
      };
      
      console.log(`  Проверки:`);
      for (const [check, result] of Object.entries(checks)) {
        console.log(`    ${check}: ${result ? '✓' : '✗'}`);
      }
    }
  }

  process.exit(0);
}

debugTestInEndpoint().catch(console.error);