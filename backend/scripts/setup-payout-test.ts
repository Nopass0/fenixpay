import { db } from '../src/db';
import { sha256 } from '../src/utils/hash';

console.log('🔧 Настройка тестовой среды для выплат...\n');

async function setupPayoutTest() {
  try {
    // 1. Создаем дополнительные методы платежей
    console.log('1. Создание методов платежей...');
    
    const payoutMethods = [
      { 
        code: 'sber_sbp', 
        name: 'Сбербанк СБП', 
        type: 'c2c' as const, 
        isEnabled: true,
        commissionPayin: 0.02,
        commissionPayout: 0.02,
        maxPayin: 100000,
        minPayin: 100,
        maxPayout: 100000,
        minPayout: 100,
        chancePayin: 0.95,
        chancePayout: 0.95,
      },
      { 
        code: 'tinkoff_sbp', 
        name: 'Тинькофф СБП', 
        type: 'c2c' as const, 
        isEnabled: true,
        commissionPayin: 0.02,
        commissionPayout: 0.02,
        maxPayin: 150000,
        minPayin: 100,
        maxPayout: 150000,
        minPayout: 100,
        chancePayin: 0.97,
        chancePayout: 0.97,
      },
      { 
        code: 'vtb_sbp', 
        name: 'ВТБ СБП', 
        type: 'c2c' as const, 
        isEnabled: true,
        commissionPayin: 0.025,
        commissionPayout: 0.025,
        maxPayin: 80000,
        minPayin: 100,
        maxPayout: 80000,
        minPayout: 100,
        chancePayin: 0.93,
        chancePayout: 0.93,
      },
      { 
        code: 'alfa_sbp', 
        name: 'Альфа СБП', 
        type: 'c2c' as const, 
        isEnabled: true,
        commissionPayin: 0.02,
        commissionPayout: 0.02,
        maxPayin: 120000,
        minPayin: 100,
        maxPayout: 120000,
        minPayout: 100,
        chancePayin: 0.96,
        chancePayout: 0.96,
      },
    ];

    for (const methodData of payoutMethods) {
      await db.method.upsert({
        where: { code: methodData.code },
        update: methodData,
        create: methodData,
      });
    }
    console.log('✅ Методы платежей созданы');

    // 2. Настраиваем мерчанта для выплат
    console.log('2. Настройка мерчанта для выплат...');
    
    const merchant = await db.merchant.upsert({
      where: { token: 'test-payout-merchant' },
      update: {
        name: 'Test Payout Merchant',
        disabled: false,
        banned: false,
        balanceUsdt: 10000,
      },
      create: {
        name: 'Test Payout Merchant',
        token: 'test-payout-merchant',
        disabled: false,
        banned: false,
        balanceUsdt: 10000,
      },
    });

    // Привязываем методы к мерчанту
    const methods = await db.method.findMany({
      where: { code: { in: payoutMethods.map(m => m.code) } }
    });

    for (const method of methods) {
      await db.merchantMethod.upsert({
        where: {
          merchantId_methodId: {
            merchantId: merchant.id,
            methodId: method.id,
          }
        },
        update: { isEnabled: true },
        create: {
          merchantId: merchant.id,
          methodId: method.id,
          isEnabled: true,
        },
      });
    }
    console.log('✅ Мерчант настроен с методами выплат');

    // 3. Создаем тестового трейдера с балансом выплат
    console.log('3. Создание тестового трейдера...');
    
    const traderPassword = 'payout123';
    const hashedPassword = await sha256(traderPassword);
    
    const trader = await db.user.upsert({
      where: { email: 'payout-trader@test.com' },
      update: {
        name: 'Payout Test Trader',
        password: hashedPassword,
        payoutBalance: 100000, // 100,000 рублей для тестирования
        balanceUsdt: 5000,
        trafficEnabled: true,
        banned: false,
        maxSimultaneousPayouts: 3,
        payoutAcceptanceTime: 5,
      },
      create: {
        email: 'payout-trader@test.com',
        name: 'Payout Test Trader',
        password: hashedPassword,
        payoutBalance: 100000,
        balanceUsdt: 5000,
        balanceRub: 0,
        frozenUsdt: 0,
        frozenRub: 0,
        trafficEnabled: true,
        banned: false,
        maxSimultaneousPayouts: 3,
        payoutAcceptanceTime: 5,
      },
    });

    console.log('✅ Тестовый трейдер создан');
    console.log(`📧 Email: payout-trader@test.com`);
    console.log(`🔐 Пароль: ${traderPassword}`);
    console.log(`💰 Баланс выплат: 100,000 ₽`);
    console.log(`🆔 ID трейдера: ${trader.id}`);

    // 4. Создаем банковские реквизиты для трейдера
    console.log('4. Создание банковских реквизитов...');
    
    const bankDetails = [
      {
        cardNumber: '2200 **** **** 1234',
        recipientName: 'ИВАНОВ ИВАН ИВАНОВИЧ',
        bankType: 'SBERBANK' as const,
        methodType: 'c2c' as const,
        phoneNumber: '+79001234567',
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 200000,
        monthlyLimit: 2000000,
      },
      {
        cardNumber: '5536 **** **** 5678',
        recipientName: 'ИВАНОВ ИВАН ИВАНОВИЧ',
        bankType: 'ALFABANK' as const,
        methodType: 'c2c' as const,
        phoneNumber: '+79001234567',
        minAmount: 100,
        maxAmount: 75000,
        dailyLimit: 300000,
        monthlyLimit: 3000000,
      },
    ];

    for (const bankDetail of bankDetails) {
      await db.bankDetail.create({
        data: {
          ...bankDetail,
          userId: trader.id,
        },
      });
    }
    console.log('✅ Банковские реквизиты созданы');

    console.log('\n🎉 Тестовая среда для выплат настроена успешно!');
    console.log('\nДанные для тестирования:');
    console.log(`- Мерчант токен: test-payout-merchant`);
    console.log(`- Трейдер email: payout-trader@test.com`);
    console.log(`- Трейдер пароль: ${traderPassword}`);
    console.log(`- Баланс выплат: 100,000 ₽`);
    
    return { merchant, trader, traderPassword };
  } catch (error) {
    console.error('❌ Ошибка при настройке:', error);
    throw error;
  }
}

// Выполняем настройку
setupPayoutTest()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));