import { db } from '../db';

async function checkSystemStatus() {
  console.log('=== ПРОВЕРКА СИСТЕМЫ ===\n');
  
  // 1. Проверка трейдера
  console.log('1. ПОЛЬЗОВАТЕЛЬ TRADER1:');
  const trader = await db.user.findUnique({
    where: { email: 'trader1@test.com' }
  });
  
  if (trader) {
    console.log(`   ✓ Найден: ${trader.email}`);
    console.log(`   • Баланс: ${trader.balanceUsdt} USDT`);
    console.log(`   • Траст-баланс: ${trader.trustBalance} USDT`);
    console.log(`   • Режим команда: ${trader.trafficEnabled ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'}`);
    
    if (trader.balanceUsdt === 0 && trader.trustBalance > 0) {
      console.log(`   ✓ МОЖЕТ получать сделки без баланса (есть траст)`);
    } else if (trader.balanceUsdt === 0 && trader.trustBalance === 0) {
      console.log(`   ✗ НЕ МОЖЕТ получать сделки (нет ни баланса, ни траста)`);
    }
  } else {
    console.log('   ✗ НЕ НАЙДЕН');
  }
  
  // 2. Проверка устройств
  console.log('\n2. УСТРОЙСТВА:');
  const devices = await db.device.findMany({
    where: { userId: trader?.id }
  });
  console.log(`   Найдено: ${devices.length}`);
  
  // 3. Проверка реквизитов
  console.log('\n3. РЕКВИЗИТЫ:');
  const bankDetails = await db.bankDetail.findMany({
    where: { userId: trader?.id }
  });
  console.log(`   Найдено: ${bankDetails.length}`);
  
  for (const bd of bankDetails) {
    console.log(`   • ${bd.bankType} - ${bd.cardNumber} ${bd.deviceId ? '(на устройстве)' : '(БТ-вход)'}`);
  }
  
  // 4. Проверка заморозки
  console.log('\n4. ПРИМЕР РАСЧЕТА ЗАМОРОЗКИ:');
  const amount = 10000; // RUB
  const rate = 90;
  const kkkPercent = 2.0;
  const feeInPercent = 1.5;
  
  const baseUsdt = amount / rate;
  const adjustedRate = rate * (1 - kkkPercent / 100);
  const frozenUsdtAmount = amount / adjustedRate;
  const calculatedCommission = baseUsdt * (feeInPercent / 100);
  const totalRequired = frozenUsdtAmount + calculatedCommission;
  
  console.log(`   Сумма: ${amount} RUB`);
  console.log(`   Курс: ${rate}`);
  console.log(`   Требуется заморозить: ${totalRequired.toFixed(2)} USDT`);
  
  // 5. Проверка прибыли
  console.log('\n5. РАСЧЕТ ПРИБЫЛИ:');
  const profitPercent = trader?.profitPercent || 1.5;
  const profit = amount * (profitPercent / 100);
  console.log(`   Процент трейдера: ${profitPercent}%`);
  console.log(`   Прибыль с ${amount} RUB = ${profit} RUB`);
  
  // 6. NotificationMatcherService
  console.log('\n6. NOTIFICATIONMATCHERSERVICE:');
  console.log('   Логика работы:');
  console.log('   1) Получает уведомления с type=AppNotification');
  console.log('   2) Извлекает сумму регулярным выражением');
  console.log('   3) Ищет транзакции с совпадающей суммой и банком');
  console.log('   4) Меняет статус транзакции на READY');
  console.log('   5) Отправляет callback на callbackUri');
  
  // 7. Проверка активных сервисов
  console.log('\n7. АКТИВНЫЕ СЕРВИСЫ:');
  const services = await db.service.findMany({
    where: { isActive: true }
  });
  
  for (const service of services) {
    if (service.name.includes('Notification')) {
      console.log(`   • ${service.name}: АКТИВЕН`);
    }
  }
  
  console.log('\n=== КОНЕЦ ПРОВЕРКИ ===');
}

checkSystemStatus()
  .catch(console.error)
  .finally(() => db.$disconnect());