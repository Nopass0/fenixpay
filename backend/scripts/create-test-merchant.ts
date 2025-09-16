#!/usr/bin/env bun
import { db } from '../src/db';
import { randomBytes } from 'crypto';

async function createTestMerchant() {
  console.log('🔍 Проверяем наличие тестового мерчанта...');
  
  // Проверяем, существует ли тестовый мерчант
  let merchant = await db.merchant.findFirst({
    where: { name: 'test' }
  });
  
  if (merchant) {
    console.log('✅ Тестовый мерчант уже существует:');
    console.log(`   ID: ${merchant.id}`);
    console.log(`   Имя: ${merchant.name}`);
    console.log(`   Токен: ${merchant.token}`);
    console.log(`   Статус: ${merchant.disabled ? 'Отключен' : 'Активен'}`);
    return merchant;
  }
  
  // Создаем нового тестового мерчанта
  const token = randomBytes(32).toString('hex');
  merchant = await db.merchant.create({
    data: {
      name: 'test',
      token: token,
      disabled: false,
      banned: false,
      balanceUsdt: 10000 // Начальный баланс для тестов
    }
  });
  
  console.log('✨ Создан новый тестовый мерчант:');
  console.log(`   ID: ${merchant.id}`);
  console.log(`   Имя: ${merchant.name}`);
  console.log(`   Токен: ${merchant.token}`);
  console.log(`   Баланс: ${merchant.balanceUsdt} USDT`);
  
  // Подключаем все активные методы к тестовому мерчанту
  const methods = await db.method.findMany({
    where: { isEnabled: true }
  });
  
  console.log(`\n📝 Найдено ${methods.length} активных методов`);
  
  for (const method of methods) {
    const existing = await db.merchantMethod.findUnique({
      where: {
        merchantId_methodId: {
          merchantId: merchant.id,
          methodId: method.id
        }
      }
    });
    
    if (!existing) {
      await db.merchantMethod.create({
        data: {
          merchantId: merchant.id,
          methodId: method.id,
          isEnabled: true
        }
      });
      console.log(`   ✅ Подключен метод: ${method.name} (${method.code})`);
    }
  }
  
  console.log('\n🎉 Тестовый мерчант готов к использованию!');
  console.log('\n📌 Используйте этот токен для API запросов:');
  console.log(`   ${merchant.token}`);
  
  return merchant;
}

createTestMerchant()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });