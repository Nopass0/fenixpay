import { db } from "../src/db";

async function checkTraderEligibility() {
  console.log("=== Проверка готовности трейдеров для приема сделок ===\n");

  const traders = await db.user.findMany({
    include: {
      bankDetails: {
        include: {
          device: true
        }
      },
      team: true
    }
  });

  for (const trader of traders) {
    console.log(`\nТрейдер: ${trader.email} (ID: ${trader.id})`);
    console.log(`  Депозит: ${trader.deposit}`);
    console.log(`  Команда: ${trader.teamId ? `${trader.team?.name || trader.teamId}` : 'НЕТ (не в команде)'}`);
    console.log(`  Трафик включен: ${trader.trafficEnabled ? 'ДА' : 'НЕТ'}`);
    console.log(`  Баланс доверия: ${trader.trustBalance} USDT`);
    console.log(`  Заморожено: ${trader.frozenUsdt} USDT`);
    console.log(`  Забанен: ${trader.banned ? 'ДА' : 'НЕТ'}`);
    
    const eligibleForTransactions = 
      trader.deposit > 0 && 
      trader.teamId !== null && 
      trader.trafficEnabled && 
      !trader.banned;
    
    console.log(`  ✓ Готов к приему сделок: ${eligibleForTransactions ? 'ДА' : 'НЕТ'}`);
    
    if (!eligibleForTransactions) {
      console.log(`  Причины отклонения:`);
      if (trader.deposit <= 0) console.log(`    - Нет депозита (текущий: ${trader.deposit})`);
      if (!trader.teamId) console.log(`    - Не в команде`);
      if (!trader.trafficEnabled) console.log(`    - Трафик отключен`);
      if (trader.banned) console.log(`    - Забанен`);
    }
    
    // Проверяем реквизиты
    console.log(`\n  Реквизиты (${trader.bankDetails.length}):`);
    for (const req of trader.bankDetails) {
      const deviceStatus = req.device 
        ? `${req.device.isOnline ? 'онлайн' : 'оффлайн'}, ${req.device.isWorking ? 'работает' : 'не работает'}`
        : 'БТ (без устройства)';
      
      const isAvailable = !req.isArchived && (
        !req.deviceId || 
        (req.device && req.device.isOnline && req.device.isWorking)
      );
      
      console.log(`    - ${req.bankType} ${req.cardNumber}`);
      console.log(`      Архивирован: ${req.isArchived ? 'ДА' : 'НЕТ'}`);
      console.log(`      Устройство: ${deviceStatus}`);
      console.log(`      Лимиты: ${req.minAmount}-${req.maxAmount} RUB`);
      console.log(`      ✓ Доступен для сделок: ${isAvailable && eligibleForTransactions ? 'ДА' : 'НЕТ'}`);
    }
  }

  // Проверяем мерчантов
  console.log("\n\n=== Проверка мерчантов ===");
  const merchants = await db.merchant.findMany({
    include: {
      merchantMethods: {
        include: {
          method: true
        }
      }
    }
  });

  for (const merchant of merchants) {
    console.log(`\nМерчант: ${merchant.name} (ID: ${merchant.id})`);
    console.log(`  Отключен: ${merchant.disabled ? 'ДА' : 'НЕТ'}`);
    console.log(`  Забанен: ${merchant.banned ? 'ДА' : 'НЕТ'}`);
    console.log(`  API ключ: ${merchant.apiKeyPublic ? 'Есть' : 'НЕТ'}`);
    console.log(`  Баланс: ${merchant.balanceUsdt} USDT`);
    console.log(`  Методы (${merchant.merchantMethods.length}):`);
    
    for (const mm of merchant.merchantMethods) {
      console.log(`    - ${mm.method.name} (${mm.method.type}): ${mm.isEnabled ? 'Включен' : 'Отключен'}`);
    }
  }

  process.exit(0);
}

checkTraderEligibility().catch(console.error);