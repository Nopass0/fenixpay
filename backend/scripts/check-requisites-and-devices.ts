import { db } from "../src/db";

async function checkRequisitesAndDevices() {
  console.log("=== Проверка реквизитов и устройств ===\n");

  // 1. Получаем всех пользователей (трейдеров)
  const traders = await db.user.findMany({
    include: {
      bankDetails: {
        include: {
          device: true
        }
      },
      devices: true
    }
  });

  console.log(`Найдено трейдеров: ${traders.length}\n`);

  for (const trader of traders) {
    console.log(`\nТрейдер: ${trader.email} (ID: ${trader.id})`);
    console.log(`  Баланс: ${trader.trustBalance} USDT`);
    console.log(`  Заморожено: ${trader.frozenUsdt} USDT`);
    console.log(`  Доступно: ${trader.trustBalance - trader.frozenUsdt} USDT`);
    
    // Проверяем устройства
    console.log(`\n  Устройства (${trader.devices.length}):`);
    for (const device of trader.devices) {
      console.log(`    - ${device.name} (${device.id})`);
      console.log(`      Онлайн: ${device.isOnline ? 'Да' : 'Нет'}`);
      console.log(`      Работает: ${device.isWorking ? 'Да' : 'Нет'}`);
      console.log(`      Токен: ${device.token?.substring(0, 20)}...`);
    }

    // Проверяем реквизиты
    console.log(`\n  Реквизиты (${trader.bankDetails.length}):`);
    for (const req of trader.bankDetails) {
      console.log(`    - ${req.bankType} ${req.cardNumber}`);
      console.log(`      ID: ${req.id}`);
      console.log(`      Архивирован: ${req.isArchived ? 'Да' : 'Нет'}`);
      console.log(`      Устройство: ${req.deviceId || 'БТ (нет устройства)'}`);
      if (req.device) {
        console.log(`      Устройство онлайн: ${req.device.isOnline ? 'Да' : 'Нет'}`);
        console.log(`      Устройство работает: ${req.device.isWorking ? 'Да' : 'Нет'}`);
      }
      console.log(`      Лимиты: ${req.minAmount}-${req.maxAmount} RUB`);
      console.log(`      Дневной лимит: ${req.dailyLimit} RUB`);
    }
  }

  // 2. Проверяем доступные реквизиты для транзакций
  console.log("\n\n=== Доступные реквизиты для транзакций ===");
  
  const availableRequisites = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      OR: [
        { deviceId: null }, // БТ реквизиты
        { 
          device: {
            isOnline: true,
            isWorking: true
          }
        }
      ],
      user: {
        banned: false
      }
    },
    include: {
      user: true,
      device: true
    }
  });

  console.log(`\nНайдено доступных реквизитов: ${availableRequisites.length}`);
  
  const btRequisites = availableRequisites.filter(r => !r.deviceId);
  const deviceRequisites = availableRequisites.filter(r => r.deviceId);
  
  console.log(`  - БТ реквизитов (без устройства): ${btRequisites.length}`);
  console.log(`  - Реквизитов с подключенными устройствами: ${deviceRequisites.length}`);

  // 3. Проверяем недоступные реквизиты (с отключенными устройствами)
  const unavailableRequisites = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      deviceId: { not: null },
      OR: [
        {
          device: {
            isOnline: false
          }
        },
        {
          device: {
            isWorking: false
          }
        }
      ]
    },
    include: {
      user: true,
      device: true
    }
  });

  console.log(`\nНедоступных реквизитов (устройство не подключено): ${unavailableRequisites.length}`);
  for (const req of unavailableRequisites) {
    console.log(`  - ${req.user.email}: ${req.bankType} ${req.cardNumber} (онлайн: ${req.device?.isOnline}, работает: ${req.device?.isWorking})`);
  }

  // 4. Проверяем тестового мерчанта
  const testMerchant = await db.merchant.findFirst({
    where: { name: { contains: "test", mode: "insensitive" } },
    include: {
      merchantMethods: {
        include: {
          method: true
        }
      }
    }
  });

  if (testMerchant) {
    console.log(`\n\n=== Тестовый мерчант: ${testMerchant.name} ===`);
    console.log(`Активен: ${testMerchant.isActive ? 'Да' : 'Нет'}`);
    console.log(`Отключен: ${testMerchant.disabled ? 'Да' : 'Нет'}`);
    console.log(`\nДоступные методы:`);
    for (const mm of testMerchant.merchantMethods) {
      console.log(`  - ${mm.method.name} (${mm.method.type}): ${mm.isEnabled ? 'Включен' : 'Отключен'}`);
    }
  }

  process.exit(0);
}

checkRequisitesAndDevices().catch(console.error);