import { db } from "../src/db";

async function checkTransactionCreationIssue() {
  console.log("=== Диагностика проблемы создания транзакций ===\n");

  // 1. Проверяем мерчанта test
  const testMerchant = await db.merchant.findFirst({
    where: { name: "test" },
    include: {
      merchantMethods: {
        include: { method: true }
      }
    }
  });

  if (testMerchant) {
    console.log(`Мерчант: ${testMerchant.name} (ID: ${testMerchant.id})`);
    console.log(`  Отключен: ${testMerchant.disabled ? 'ДА' : 'НЕТ'}`);
    console.log(`  Забанен: ${testMerchant.banned ? 'ДА' : 'НЕТ'}`);
    console.log(`  Баланс: ${testMerchant.balanceUsdt} USDT`);
    console.log(`  Методы (${testMerchant.merchantMethods.length}):`);
    
    for (const mm of testMerchant.merchantMethods) {
      console.log(`    - ${mm.method.name} (${mm.method.type}): ${mm.isEnabled ? 'Включен' : 'Отключен'} (ID: ${mm.methodId})`);
    }
  }

  // 2. Проверяем трейдера
  console.log("\n");
  const trader = await db.user.findFirst({
    where: { email: "trader@test.com" },
    include: {
      bankDetails: {
        include: { device: true }
      }
    }
  });

  if (trader) {
    console.log(`Трейдер: ${trader.email} (ID: ${trader.id})`);
    console.log(`  Трафик включен: ${trader.trafficEnabled ? 'ДА' : 'НЕТ'}`);
    console.log(`  Депозит: ${trader.deposit}`);
    console.log(`  Баланс доверия: ${trader.trustBalance} USDT`);
    console.log(`  Забанен: ${trader.banned ? 'ДА' : 'НЕТ'}`);
    
    console.log(`\n  Реквизиты (${trader.bankDetails.length}):`);
    for (const req of trader.bankDetails) {
      console.log(`    - ${req.bankType} ${req.cardNumber} (ID: ${req.id})`);
      console.log(`      Архивирован: ${req.isArchived ? 'ДА' : 'НЕТ'}`);
      console.log(`      Метод: ${req.methodType}`);
      console.log(`      Лимиты: ${req.minAmount}-${req.maxAmount} RUB`);
      console.log(`      Лимиты трейдера: ${trader.minAmountPerRequisite}-${trader.maxAmountPerRequisite} RUB`);
      
      if (req.device) {
        console.log(`      Устройство: ${req.device.name}`);
        console.log(`        - Онлайн: ${req.device.isOnline ? 'ДА' : 'НЕТ'}`);
        console.log(`        - Работает: ${req.device.isWorking ? 'ДА' : 'НЕТ'}`);
      } else {
        console.log(`      Устройство: БТ (без устройства)`);
      }
    }
  }

  // 3. Проверяем соответствие методов
  console.log("\n=== Проверка соответствия методов ===");
  
  if (testMerchant && trader) {
    for (const mm of testMerchant.merchantMethods) {
      if (!mm.isEnabled) continue;
      
      console.log(`\nМетод ${mm.method.name} (${mm.method.type}):`);
      
      // Ищем реквизиты с подходящим типом метода
      const matchingRequisites = trader.bankDetails.filter(bd => 
        bd.methodType === mm.method.type && 
        !bd.isArchived &&
        (!bd.deviceId || (bd.device && bd.device.isOnline && bd.device.isWorking))
      );
      
      console.log(`  Подходящих реквизитов: ${matchingRequisites.length}`);
      
      if (matchingRequisites.length === 0) {
        console.log(`  ❌ Нет подходящих реквизитов для этого метода`);
      } else {
        for (const req of matchingRequisites) {
          console.log(`  ✓ ${req.bankType} ${req.cardNumber}`);
        }
      }
    }
  }

  // 4. Симулируем поиск реквизита как в merchant API
  console.log("\n=== Симуляция поиска реквизита (как в API) ===");
  
  // Берем первый включенный метод
  const enabledMethod = testMerchant?.merchantMethods.find(mm => mm.isEnabled);
  if (enabledMethod) {
    const testAmount = 5000; // Тестовая сумма
    
    console.log(`Ищем реквизит для суммы ${testAmount} RUB, метод ${enabledMethod.method.name} (${enabledMethod.method.type})`);
    
    const pool = await db.bankDetail.findMany({
      where: {
        isArchived: false,
        methodType: enabledMethod.method.type,
        user: { 
          banned: false,
          deposit: { gt: 0 },
          trafficEnabled: true
        },
        OR: [
          { deviceId: null },
          { device: { isWorking: true, isOnline: true } }
        ]
      },
      include: { user: true, device: true }
    });

    console.log(`\nНайдено реквизитов по условиям API: ${pool.length}`);
    
    if (pool.length === 0) {
      console.log("\nПроверяем почему не найдены реквизиты:");
      
      // Проверяем без условия trafficEnabled
      const withoutTraffic = await db.bankDetail.findMany({
        where: {
          isArchived: false,
          methodType: enabledMethod.method.type,
          user: { 
            banned: false,
            deposit: { gt: 0 }
          },
          OR: [
            { deviceId: null },
            { device: { isWorking: true, isOnline: true } }
          ]
        }
      });
      
      console.log(`  Без проверки trafficEnabled: ${withoutTraffic.length} реквизитов`);
      
      // Проверяем без условия deposit
      const withoutDeposit = await db.bankDetail.findMany({
        where: {
          isArchived: false,
          methodType: enabledMethod.method.type,
          user: { 
            banned: false,
            trafficEnabled: true
          },
          OR: [
            { deviceId: null },
            { device: { isWorking: true, isOnline: true } }
          ]
        }
      });
      
      console.log(`  Без проверки deposit > 0: ${withoutDeposit.length} реквизитов`);
      
      // Проверяем все реквизиты с нужным методом
      const allWithMethod = await db.bankDetail.findMany({
        where: {
          isArchived: false,
          methodType: enabledMethod.method.type
        },
        include: { user: true }
      });
      
      console.log(`  Всего реквизитов с методом ${enabledMethod.method.type}: ${allWithMethod.length}`);
      
      for (const req of allWithMethod) {
        console.log(`\n  Реквизит ${req.id}:`);
        console.log(`    Пользователь: ${req.user.email}`);
        console.log(`    trafficEnabled: ${req.user.trafficEnabled}`);
        console.log(`    deposit: ${req.user.deposit}`);
        console.log(`    teamId: ${req.user.teamId || 'NULL'}`);
        console.log(`    banned: ${req.user.banned}`);
      }
    }
  }

  process.exit(0);
}

checkTransactionCreationIssue().catch(console.error);