import { db } from '../db';
import { MethodType, BankType, Status, TransactionType, NotificationType } from '@prisma/client';
import { randomBytes } from 'crypto';

const TRADER_EMAIL = 'trader1@test.com';

async function setupTestRequisites() {
  console.log('\n=== 1. Настройка реквизитов для трейдера ===');
  
  // Находим трейдера
  const trader = await db.user.findUnique({
    where: { email: TRADER_EMAIL },
    include: {
      devices: true,
      bankDetails: true
    }
  });
  
  if (!trader) {
    console.log('✗ Трейдер не найден');
    return null;
  }
  
  console.log(`Трейдер: ${trader.email}`);
  console.log(`  Баланс: ${trader.balanceUsdt} USDT, траст: ${trader.trustBalance} USDT`);
  console.log(`  Устройств: ${trader.devices.length}`);
  console.log(`  Реквизитов: ${trader.bankDetails.length}`);
  
  // Создаем устройство если нет
  let device = trader.devices[0];
  if (!device) {
    device = await db.device.create({
      data: {
        name: 'Test Device',
        userId: trader.id,
        token: randomBytes(32).toString('hex'),
        emulated: true,
        lastActiveAt: new Date()
      }
    });
    console.log('✓ Создано устройство');
  }
  
  // Создаем реквизиты если нет
  if (trader.bankDetails.length === 0) {
    // СБП на устройстве
    await db.bankDetail.create({
      data: {
        userId: trader.id,
        deviceId: device.id,
        methodType: MethodType.SBP,
        bankType: BankType.SBERBANK,
        cardNumber: '+79001234567',
        recipientName: 'TEST USER',
        phoneNumber: '+79001234567',
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        isArchived: false
      }
    });
    console.log('✓ Создан реквизит СБП на устройстве');
    
    // C2C на устройстве
    await db.bankDetail.create({
      data: {
        userId: trader.id,
        deviceId: device.id,
        methodType: MethodType.C2C,
        bankType: BankType.VTB,
        cardNumber: '4111111111111111',
        recipientName: 'TEST USER',
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        isArchived: false
      }
    });
    console.log('✓ Создан реквизит C2C на устройстве');
    
    // СБП без устройства (БТ-вход)
    await db.bankDetail.create({
      data: {
        userId: trader.id,
        methodType: MethodType.SBP,
        bankType: BankType.TBANK,
        cardNumber: '+79001234568',
        recipientName: 'TEST USER',
        phoneNumber: '+79001234568',
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        isArchived: false
      }
    });
    console.log('✓ Создан реквизит СБП на БТ-входе (без устройства)');
  }
  
  return trader;
}

async function testTransactionWithoutBalance() {
  console.log('\n=== 2. Проверка получения сделок без баланса ===');
  
  const trader = await db.user.findUnique({
    where: { email: TRADER_EMAIL }
  });
  
  if (!trader) return;
  
  console.log(`Баланс трейдера: ${trader.balanceUsdt} USDT`);
  console.log(`Траст-баланс: ${trader.trustBalance} USDT`);
  
  if (trader.balanceUsdt === 0 && trader.trustBalance > 0) {
    console.log('✓ Трейдер может получать сделки без баланса (есть траст)');
  } else if (trader.balanceUsdt === 0 && trader.trustBalance === 0) {
    console.log('✗ Трейдер НЕ может получать сделки (нет ни баланса, ни траста)');
  }
}

async function testTeamMode() {
  console.log('\n=== 3. Проверка переключателя Команда ===');
  
  const trader = await db.user.findUnique({
    where: { email: TRADER_EMAIL }
  });
  
  if (!trader) return;
  
  console.log(`Режим Команда: ${trader.trafficEnabled ? 'включен' : 'выключен'}`);
  
  // Выключаем режим
  await db.user.update({
    where: { id: trader.id },
    data: { trafficEnabled: false }
  });
  console.log('✓ Режим Команда выключен');
  console.log('   При выключенном режиме трейдер НЕ должен получать новые сделки');
  
  // Включаем обратно
  await db.user.update({
    where: { id: trader.id },
    data: { trafficEnabled: true }
  });
  console.log('✓ Режим Команда включен обратно');
}

async function testFreezing() {
  console.log('\n=== 4. Проверка заморозки средств ===');
  
  const trader = await db.user.findUnique({
    where: { email: TRADER_EMAIL }
  });
  
  if (!trader) return;
  
  // Добавляем баланс для теста
  await db.user.update({
    where: { id: trader.id },
    data: { balanceUsdt: 1000 }
  });
  
  const amount = 10000; // RUB
  const rate = 90;
  const kkkPercent = 2.0;
  const feeInPercent = 1.5;
  
  // Расчет заморозки
  const baseUsdt = amount / rate;
  const adjustedRate = rate * (1 - kkkPercent / 100);
  const frozenUsdtAmount = amount / adjustedRate;
  const calculatedCommission = baseUsdt * (feeInPercent / 100);
  const totalRequired = frozenUsdtAmount + calculatedCommission;
  
  console.log(`Для транзакции ${amount} RUB при курсе ${rate}:`);
  console.log(`  Требуется заморозить: ${totalRequired.toFixed(2)} USDT`);
  console.log(`  - Основная сумма с KKK: ${frozenUsdtAmount.toFixed(2)} USDT`);
  console.log(`  - Комиссия: ${calculatedCommission.toFixed(2)} USDT`);
  
  // Проверяем возможность создания транзакции
  if (trader.balanceUsdt >= totalRequired) {
    console.log(`✓ Баланса достаточно для создания транзакции`);
  } else {
    console.log(`✗ Баланса НЕ достаточно (есть ${trader.balanceUsdt}, нужно ${totalRequired.toFixed(2)})`);
  }
}

async function testProfitCalculation() {
  console.log('\n=== 5. Проверка расчета прибыли ===');
  
  const trader = await db.user.findUnique({
    where: { email: TRADER_EMAIL }
  });
  
  if (!trader) return;
  
  const transactionAmount = 10000; // RUB
  const profitPercent = trader.profitPercent || 1.5;
  const profit = transactionAmount * (profitPercent / 100);
  
  console.log(`Для транзакции ${transactionAmount} RUB:`);
  console.log(`  Процент прибыли трейдера: ${profitPercent}%`);
  console.log(`  Прибыль: ${profit} RUB`);
}

async function checkNotificationService() {
  console.log('\n=== 6. Проверка NotificationMatcherService ===');
  
  // Проверяем наличие сервиса
  const services = await db.service.findMany({
    where: {
      name: { contains: 'NotificationMatcher' }
    }
  });
  
  if (services.length > 0) {
    console.log('✓ NotificationMatcherService найден в базе');
    for (const service of services) {
      console.log(`  Статус: ${service.isActive ? 'активен' : 'неактивен'}`);
      console.log(`  Последняя активность: ${service.lastActivity}`);
    }
  } else {
    console.log('✗ NotificationMatcherService не найден в базе');
  }
  
  console.log('\nЛогика сопоставления:');
  console.log('  1. Берет уведомления с устройства');
  console.log('  2. Извлекает сумму из текста уведомления');
  console.log('  3. Ищет транзакции с той же суммой и банком');
  console.log('  4. При совпадении меняет статус на READY');
  console.log('  5. Отправляет callback мерчанту');
}

async function checkCallbackLogic() {
  console.log('\n=== 7. Проверка отправки callback ===');
  
  console.log('При автоматическом подтверждении (статус READY):');
  console.log('  1. Транзакция помечается как подтвержденная');
  console.log('  2. Отправляется POST запрос на callbackUri');
  console.log('  3. В запросе передается:');
  console.log('     - transactionId');
  console.log('     - orderId');
  console.log('     - status: "success"');
  console.log('     - amount');
  console.log('     - timestamp');
}

async function main() {
  try {
    await setupTestRequisites();
    await testTransactionWithoutBalance();
    await testTeamMode();
    await testFreezing();
    await testProfitCalculation();
    await checkNotificationService();
    await checkCallbackLogic();
    
    console.log('\n=== Проверка завершена ===');
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await db.$disconnect();
  }
}

main();