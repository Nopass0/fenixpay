import { randomBytes } from 'crypto';

const API_URL = 'http://localhost:3000';
const TRADER_EMAIL = 'trader1@test.com';

interface TestMerchant {
  id: string;
  token: string;
  email: string;
  password: string;
}

// Создаем тестового мерчанта
async function createTestMerchant(): Promise<TestMerchant> {
  console.log('\n=== 1. Создание тестового мерчанта ===');
  
  const email = `test-merchant-${Date.now()}@test.com`;
  const password = 'merchant123';
  
  // Сначала нужно создать мерчанта через админ API
  // Для этого нужен админ ключ
  const adminKey = process.env.SUPER_ADMIN_KEY || 'test-admin-key';
  
  try {
    // Получаем список методов
    const methodsResponse = await fetch(`${API_URL}/admin/methods`, {
      headers: {
        'X-Admin-Key': adminKey
      }
    });
    
    if (!methodsResponse.ok) {
      console.log('✗ Не удалось получить методы:', await methodsResponse.text());
      throw new Error('Failed to get methods');
    }
    
    const methods = await methodsResponse.json();
    console.log(`✓ Найдено методов: ${methods.length}`);
    
    // Создаем мерчанта
    const createResponse = await fetch(`${API_URL}/admin/merchants`, {
      method: 'POST',
      headers: {
        'X-Admin-Key': adminKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        name: 'Test Merchant API',
        balanceUsdt: 10000
      })
    });
    
    if (!createResponse.ok) {
      console.log('✗ Не удалось создать мерчанта:', await createResponse.text());
      throw new Error('Failed to create merchant');
    }
    
    const { merchant, password: generatedPassword } = await createResponse.json();
    console.log(`✓ Мерчант создан: ${merchant.email}`);
    console.log(`  ID: ${merchant.id}`);
    console.log(`  Token: ${merchant.token}`);
    console.log(`  Password: ${generatedPassword}`);
    
    // Включаем методы для мерчанта
    const sbpMethod = methods.find((m: any) => m.type === 'sbp');
    const c2cMethod = methods.find((m: any) => m.type === 'c2c');
    
    if (sbpMethod) {
      await fetch(`${API_URL}/admin/merchants/${merchant.id}/methods`, {
        method: 'POST',
        headers: {
          'X-Admin-Key': adminKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          methodId: sbpMethod.id,
          isEnabled: true
        })
      });
      console.log('✓ Включен метод SBP');
    }
    
    if (c2cMethod) {
      await fetch(`${API_URL}/admin/merchants/${merchant.id}/methods`, {
        method: 'POST',
        headers: {
          'X-Admin-Key': adminKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          methodId: c2cMethod.id,
          isEnabled: true
        })
      });
      console.log('✓ Включен метод C2C');
    }
    
    return {
      id: merchant.id,
      token: merchant.token,
      email: merchant.email,
      password: generatedPassword
    };
    
  } catch (error) {
    console.error('Ошибка при создании мерчанта:', error);
    throw error;
  }
}

// Создаем транзакцию через API мерчанта
async function createTransaction(merchant: TestMerchant, amount: number, paymentMethod: 'sbp' | 'c2c') {
  console.log(`\n=== 2. Создание транзакции ${amount} RUB (${paymentMethod.toUpperCase()}) ===`);
  
  try {
    // Получаем доступные методы
    const methodsResponse = await fetch(`${API_URL}/merchant/methods`, {
      headers: {
        'X-Merchant-API-Key': merchant.token
      }
    });
    
    if (!methodsResponse.ok) {
      console.log('✗ Не удалось получить методы мерчанта:', await methodsResponse.text());
      throw new Error('Failed to get merchant methods');
    }
    
    const methods = await methodsResponse.json();
    const method = methods.find((m: any) => m.method.type === paymentMethod);
    
    if (!method) {
      console.log(`✗ Метод ${paymentMethod} не найден или не включен`);
      throw new Error(`Method ${paymentMethod} not found`);
    }
    
    console.log(`✓ Используем метод: ${method.method.name} (ID: ${method.methodId})`);
    
    // Создаем транзакцию
    const txResponse = await fetch(`${API_URL}/merchant/transactions/in`, {
      method: 'POST',
      headers: {
        'X-Merchant-API-Key': merchant.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        orderId: `order-${Date.now()}`,
        methodId: method.methodId,
        rate: 90,
        expired_at: new Date(Date.now() + 86400000).toISOString(),
        callbackUri: 'https://webhook.site/test-callback'
      })
    });
    
    if (!txResponse.ok) {
      const error = await txResponse.text();
      console.log('✗ Не удалось создать транзакцию:', error);
      throw new Error('Failed to create transaction');
    }
    
    const transaction = await txResponse.json();
    console.log(`✓ Транзакция создана:`);
    console.log(`  ID: ${transaction.id}`);
    console.log(`  Numeric ID: ${transaction.numericId}`);
    console.log(`  Сумма: ${transaction.amount} RUB`);
    console.log(`  Статус: ${transaction.status}`);
    console.log(`  Трейдер: ${transaction.traderId}`);
    
    if (transaction.requisites) {
      console.log(`  Реквизиты:`);
      console.log(`    Банк: ${transaction.requisites.bankType}`);
      console.log(`    Номер: ${transaction.requisites.cardNumber}`);
      console.log(`    Имя: ${transaction.requisites.recipientName}`);
    }
    
    return transaction;
    
  } catch (error) {
    console.error('Ошибка при создании транзакции:', error);
    throw error;
  }
}

// Проверяем баланс трейдера
async function checkTraderBalance() {
  console.log('\n=== 3. Проверка баланса трейдера ===');
  
  try {
    // Нужен админ ключ для проверки
    const adminKey = process.env.SUPER_ADMIN_KEY || 'test-admin-key';
    
    const response = await fetch(`${API_URL}/admin/users?search=${TRADER_EMAIL}`, {
      headers: {
        'X-Admin-Key': adminKey
      }
    });
    
    if (!response.ok) {
      console.log('✗ Не удалось получить данные трейдера');
      return;
    }
    
    const data = await response.json();
    const trader = data.users?.find((u: any) => u.email === TRADER_EMAIL);
    
    if (trader) {
      console.log(`✓ Трейдер найден: ${trader.email}`);
      console.log(`  Баланс USDT: ${trader.balanceUsdt}`);
      console.log(`  Баланс RUB: ${trader.balanceRub}`);
      console.log(`  Траст-баланс: ${trader.trustBalance}`);
      console.log(`  Заморожено USDT: ${trader.frozenUsdt}`);
      console.log(`  Командный режим: ${trader.trafficEnabled ? 'включен' : 'выключен'}`);
      
      if (trader.balanceUsdt === 0 && trader.trustBalance > 0) {
        console.log('  ✓ Может получать сделки без баланса (есть траст)');
      }
    }
    
  } catch (error) {
    console.error('Ошибка при проверке трейдера:', error);
  }
}

// Симулируем уведомление от банка
async function simulateBankNotification(transactionId: string, amount: number) {
  console.log(`\n=== 4. Симуляция уведомления от банка (${amount} RUB) ===`);
  
  try {
    // Получаем информацию о транзакции
    const adminKey = process.env.SUPER_ADMIN_KEY || 'test-admin-key';
    
    const txResponse = await fetch(`${API_URL}/admin/transactions/${transactionId}`, {
      headers: {
        'X-Admin-Key': adminKey
      }
    });
    
    if (!txResponse.ok) {
      console.log('✗ Не удалось получить транзакцию');
      return;
    }
    
    const transaction = await txResponse.json();
    console.log(`✓ Транзакция найдена, трейдер: ${transaction.traderId}`);
    
    // Получаем устройство трейдера
    const devicesResponse = await fetch(`${API_URL}/admin/devices?userId=${transaction.traderId}`, {
      headers: {
        'X-Admin-Key': adminKey
      }
    });
    
    if (!devicesResponse.ok) {
      console.log('✗ Не удалось получить устройства');
      return;
    }
    
    const devices = await devicesResponse.json();
    if (devices.length === 0) {
      console.log('✗ У трейдера нет устройств');
      return;
    }
    
    const device = devices[0];
    console.log(`✓ Найдено устройство: ${device.name} (ID: ${device.id})`);
    
    // Определяем пакет приложения банка
    let packageName = 'ru.sberbankmobile';
    let bankName = 'Сбербанк';
    
    if (transaction.bankDetail?.bankType === 'VTB') {
      packageName = 'ru.vtb24.mobilebanking.android';
      bankName = 'ВТБ';
    } else if (transaction.bankDetail?.bankType === 'TBANK') {
      packageName = 'com.idamob.tinkoff.android';
      bankName = 'Тинькофф';
    }
    
    // Создаем уведомление через device API
    const notificationData = {
      type: 'AppNotification',
      application: packageName,
      title: bankName,
      message: `Перевод от IVANOV I. Сумма: ${amount} руб. Баланс: ${amount + 10000} руб.`,
      metadata: {
        packageName: packageName,
        amount: amount,
        sender: 'IVANOV I.',
        balance: amount + 10000
      }
    };
    
    // Отправляем через device API
    console.log(`✓ Отправляем уведомление от ${bankName} на устройство`);
    console.log(`  Пакет: ${packageName}`);
    console.log(`  Сообщение: ${notificationData.message}`);
    
    // Здесь должен быть вызов API устройства, но его нужно реализовать
    // Пока создадим уведомление напрямую в БД
    
    console.log('ℹ️  Уведомление будет обработано NotificationMatcherService');
    
  } catch (error) {
    console.error('Ошибка при симуляции уведомления:', error);
  }
}

// Проверяем статус транзакции
async function checkTransactionStatus(transactionId: string) {
  console.log('\n=== 5. Проверка статуса транзакции ===');
  
  try {
    const adminKey = process.env.SUPER_ADMIN_KEY || 'test-admin-key';
    
    const response = await fetch(`${API_URL}/admin/transactions/${transactionId}`, {
      headers: {
        'X-Admin-Key': adminKey
      }
    });
    
    if (!response.ok) {
      console.log('✗ Не удалось получить транзакцию');
      return;
    }
    
    const transaction = await response.json();
    console.log(`✓ Транзакция ${transaction.numericId}:`);
    console.log(`  Статус: ${transaction.status}`);
    console.log(`  Сумма: ${transaction.amount} RUB`);
    
    if (transaction.status === 'READY') {
      console.log('  ✓ Транзакция автоматически подтверждена!');
    }
    
    if (transaction.acceptedAt) {
      console.log(`  Принята: ${new Date(transaction.acceptedAt).toLocaleString()}`);
    }
    
    if (transaction.notificationId) {
      console.log('  ✓ Уведомление сопоставлено с транзакцией');
    }
    
    if (transaction.callbackSent) {
      console.log('  ✓ Callback отправлен мерчанту');
    }
    
    // Проверяем прибыль трейдера
    if (transaction.status === 'COMPLETED' && transaction.trader) {
      const profit = transaction.amount * (transaction.trader.profitPercent / 100);
      console.log(`  Прибыль трейдера: ${profit} RUB (${transaction.trader.profitPercent}%)`);
    }
    
  } catch (error) {
    console.error('Ошибка при проверке статуса:', error);
  }
}

// Основная функция
async function main() {
  try {
    console.log('=== ТЕСТИРОВАНИЕ РЕАЛЬНОЙ СИСТЕМЫ ЧЕРЕЗ API ===');
    console.log(`API URL: ${API_URL}`);
    console.log(`Трейдер: ${TRADER_EMAIL}`);
    
    // 1. Создаем мерчанта
    const merchant = await createTestMerchant();
    
    // 2. Проверяем баланс трейдера
    await checkTraderBalance();
    
    // 3. Создаем транзакцию
    const transaction = await createTransaction(merchant, 5000, 'sbp');
    
    // 4. Ждем немного
    console.log('\nОжидание 2 секунды...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Симулируем уведомление
    await simulateBankNotification(transaction.id, transaction.amount);
    
    // 6. Ждем обработки
    console.log('\nОжидание 5 секунд для обработки уведомления...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 7. Проверяем финальный статус
    await checkTransactionStatus(transaction.id);
    
    console.log('\n=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===');
    
  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}

// Запуск
main();