import { db } from "../src/db";

async function checkSbpRequisite() {
  console.log("=== Проверка реквизитов SBP ===\n");

  // Проверяем трейдера
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

  console.log(`Трейдер: ${trader.email}`);
  console.log(`Депозит: ${trader.deposit}`);
  console.log(`trafficEnabled: ${trader.trafficEnabled}`);
  console.log(`\nВсе реквизиты трейдера:`);

  for (const req of trader.bankDetails) {
    console.log(`\n${req.methodType} - ${req.bankType} ${req.cardNumber}`);
    console.log(`  ID: ${req.id}`);
    console.log(`  Архивирован: ${req.isArchived ? 'ДА' : 'НЕТ'}`);
    console.log(`  Лимиты: ${req.minAmount}-${req.maxAmount} RUB`);
    if (req.device) {
      console.log(`  Устройство: ${req.device.name}`);
      console.log(`    - Онлайн: ${req.device.isOnline ? 'ДА' : 'НЕТ'}`);
      console.log(`    - Работает: ${req.device.isWorking ? 'ДА' : 'НЕТ'}`);
    } else {
      console.log(`  Устройство: БТ (без устройства)`);
    }
  }

  // Фильтруем SBP реквизиты
  const sbpRequisites = trader.bankDetails.filter(req => req.methodType === 'sbp');
  console.log(`\n\nНайдено SBP реквизитов: ${sbpRequisites.length}`);

  // Проверяем доступные SBP реквизиты для транзакций
  const availableSbp = sbpRequisites.filter(req =>
    !req.isArchived &&
    (!req.deviceId || (req.device && req.device.isOnline && req.device.isWorking))
  );
  
  console.log(`Доступных для транзакций SBP реквизитов: ${availableSbp.length}`);

  // Проверяем методы
  const sbpMethod = await db.method.findFirst({
    where: { type: "sbp" }
  });

  if (sbpMethod) {
    console.log(`\nМетод SBP:`);
    console.log(`  ID: ${sbpMethod.id}`);
    console.log(`  Код: ${sbpMethod.code}`);
    console.log(`  Название: ${sbpMethod.name}`);
    console.log(`  Включен: ${sbpMethod.isEnabled ? 'ДА' : 'НЕТ'}`);
  }

  // Проверяем сумму из вашего запроса
  const testAmount = 4071;
  console.log(`\n\nПроверка суммы ${testAmount} RUB для SBP:`);

  for (const req of availableSbp) {
    const inReqLimits = testAmount >= req.minAmount && testAmount <= req.maxAmount;
    const inTraderLimits = testAmount >= trader.minAmountPerRequisite && testAmount <= trader.maxAmountPerRequisite;
    const allowed = inReqLimits && inTraderLimits;
    
    console.log(`\nРеквизит ${req.bankType} ${req.cardNumber}:`);
    console.log(`  В лимитах реквизита (${req.minAmount}-${req.maxAmount}): ${inReqLimits ? '✓' : '✗'}`);
    console.log(`  В лимитах трейдера (${trader.minAmountPerRequisite}-${trader.maxAmountPerRequisite}): ${inTraderLimits ? '✓' : '✗'}`);
    console.log(`  Разрешено: ${allowed ? '✓' : '✗'}`);
  }

  process.exit(0);
}

checkSbpRequisite().catch(console.error);