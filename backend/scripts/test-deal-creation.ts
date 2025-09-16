import { db } from "../src/db";

async function testDealCreation() {
  console.log("=== Тест создания сделок ===\n");

  // Получаем мерчанта test
  const merchant = await db.merchant.findFirst({
    where: { name: "test" },
    include: {
      merchantMethods: {
        include: { method: true }
      }
    }
  });

  if (!merchant) {
    console.error("Мерчант 'test' не найден!");
    process.exit(1);
  }

  // Получаем трейдера
  const trader = await db.user.findFirst({
    where: { email: "trader@test.com" },
    include: {
      bankDetails: {
        include: { device: true }
      }
    }
  });

  if (!trader) {
    console.error("Трейдер не найден!");
    process.exit(1);
  }

  console.log(`Мерчант: ${merchant.name}`);
  console.log(`Трейдер: ${trader.email}`);
  console.log(`Депозит трейдера: ${trader.deposit}`);
  console.log(`trafficEnabled: ${trader.trafficEnabled}`);

  // Проверяем каждый метод мерчанта
  for (const mm of merchant.merchantMethods) {
    if (!mm.isEnabled) continue;

    console.log(`\n--- Метод: ${mm.method.name} (${mm.method.type}) ---`);

    // Ищем подходящие реквизиты
    const requisites = await db.bankDetail.findMany({
      where: {
        userId: trader.id,
        isArchived: false,
        methodType: mm.method.type,
        OR: [
          { deviceId: null },
          {
            device: {
              isOnline: true,
              isWorking: true
            }
          }
        ]
      },
      include: { device: true }
    });

    console.log(`Найдено реквизитов: ${requisites.length}`);

    for (const req of requisites) {
      console.log(`\nРеквизит: ${req.bankType} ${req.cardNumber}`);
      console.log(`  Лимиты реквизита: ${req.minAmount}-${req.maxAmount} RUB`);
      console.log(`  Лимиты трейдера: ${trader.minAmountPerRequisite}-${trader.maxAmountPerRequisite} RUB`);
      console.log(`  Устройство: ${req.device ? `${req.device.name} (online: ${req.device.isOnline}, working: ${req.device.isWorking})` : 'БТ'}`);

      // Проверяем различные суммы
      const testAmounts = [100, 1000, 5000, 10000, 50000, 100000];
      
      console.log("\n  Проверка сумм:");
      for (const amount of testAmounts) {
        const inReqLimits = amount >= req.minAmount && amount <= req.maxAmount;
        const inTraderLimits = amount >= trader.minAmountPerRequisite && amount <= trader.maxAmountPerRequisite;
        const allowed = inReqLimits && inTraderLimits;
        
        console.log(`    ${amount} RUB: ${allowed ? '✓' : '✗'} (реквизит: ${inReqLimits ? '✓' : '✗'}, трейдер: ${inTraderLimits ? '✓' : '✗'})`);
      }

      // Вычисляем допустимый диапазон
      const minAllowed = Math.max(req.minAmount, trader.minAmountPerRequisite);
      const maxAllowed = Math.min(req.maxAmount, trader.maxAmountPerRequisite);
      
      if (minAllowed <= maxAllowed) {
        console.log(`\n  ✓ Допустимый диапазон: ${minAllowed}-${maxAllowed} RUB`);
      } else {
        console.log(`\n  ✗ Нет пересечения лимитов!`);
      }
    }

    if (requisites.length === 0) {
      console.log("  ❌ Нет подходящих реквизитов для этого метода");
    }
  }

  // Симулируем создание сделок через API
  console.log("\n\n=== Симуляция создания сделок через админ панель ===");
  
  const testData = {
    count: 5,
    minAmount: 1000,
    maxAmount: 50000,
    merchantId: merchant.id,
    traderId: trader.id,
    useRandomData: false,
    autoConfirm: false,
    simulateErrors: false
  };

  console.log("\nПараметры теста:");
  console.log(`  Количество: ${testData.count}`);
  console.log(`  Диапазон сумм: ${testData.minAmount}-${testData.maxAmount} RUB`);
  console.log(`  Мерчант: ${merchant.name}`);
  console.log(`  Трейдер: ${trader.email}`);

  // Симулируем логику из test-tools
  const methods = await db.method.findMany({ where: { isEnabled: true } });
  const results = [];
  const errors = [];

  for (let i = 0; i < testData.count; i++) {
    const method = methods[Math.floor(Math.random() * methods.length)];
    
    // Ищем реквизит для этого метода
    const requisite = await db.bankDetail.findFirst({
      where: {
        userId: trader.id,
        isArchived: false,
        methodType: method.type,
        OR: [
          { deviceId: null },
          {
            device: {
              isOnline: true,
              isWorking: true
            }
          }
        ]
      }
    });

    if (!requisite) {
      errors.push(`Сделка ${i + 1}: Нет реквизита для метода ${method.type}`);
      continue;
    }

    // Вычисляем допустимую сумму
    const reqMinAmount = Math.max(requisite.minAmount, trader.minAmountPerRequisite, testData.minAmount);
    const reqMaxAmount = Math.min(requisite.maxAmount, trader.maxAmountPerRequisite, testData.maxAmount);
    
    if (reqMinAmount > reqMaxAmount) {
      errors.push(`Сделка ${i + 1}: Несовместимые лимиты суммы`);
      continue;
    }
    
    const amount = Math.floor(Math.random() * (reqMaxAmount - reqMinAmount + 1) + reqMinAmount);
    
    results.push({
      index: i + 1,
      method: method.type,
      amount,
      status: "OK"
    });
  }

  console.log(`\nРезультаты:`);
  console.log(`  Успешно: ${results.length}`);
  console.log(`  Ошибок: ${errors.length}`);
  
  if (results.length > 0) {
    console.log("\nУспешные:");
    for (const r of results) {
      console.log(`  ${r.index}. ${r.method} - ${r.amount} RUB`);
    }
  }
  
  if (errors.length > 0) {
    console.log("\nОшибки:");
    for (const e of errors) {
      console.log(`  ${e}`);
    }
  }

  process.exit(0);
}

testDealCreation().catch(console.error);