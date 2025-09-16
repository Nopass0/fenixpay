import { db } from '../db';
import { MethodType, BankType } from '@prisma/client';

async function setupRequisites() {
  console.log('=== Создание реквизитов для trader1 ===\n');
  
  // Находим трейдера
  const trader = await db.user.findUnique({
    where: { email: 'trader1@test.com' },
    include: {
      devices: true,
      bankDetails: true
    }
  });
  
  if (!trader) {
    console.log('✗ Трейдер не найден');
    return;
  }
  
  console.log(`Трейдер: ${trader.email}`);
  console.log(`Устройств: ${trader.devices.length}`);
  console.log(`Реквизитов до создания: ${trader.bankDetails.length}`);
  
  const device = trader.devices[0];
  if (!device) {
    console.log('✗ Нет устройства для создания реквизитов');
    return;
  }
  
  try {
    // 1. СБП на устройстве
    const sbp1 = await db.bankDetail.create({
      data: {
        userId: trader.id,
        deviceId: device.id,
        methodType: 'sbp' as MethodType,
        bankType: BankType.SBERBANK,
        cardNumber: '+79001234567',
        recipientName: 'IVAN IVANOV',
        phoneNumber: '+79001234567',
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        isArchived: false
      }
    });
    console.log('✓ Создан реквизит СБП (Сбербанк) на устройстве');
    
    // 2. C2C на устройстве
    const c2c = await db.bankDetail.create({
      data: {
        userId: trader.id,
        deviceId: device.id,
        methodType: 'c2c' as MethodType,
        bankType: BankType.VTB,
        cardNumber: '4111111111111111',
        recipientName: 'IVAN IVANOV',
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        isArchived: false
      }
    });
    console.log('✓ Создан реквизит C2C (ВТБ) на устройстве');
    
    // 3. СБП на БТ-входе (без устройства)
    const sbp2 = await db.bankDetail.create({
      data: {
        userId: trader.id,
        // deviceId не указываем - это БТ-вход
        methodType: 'sbp' as MethodType,
        bankType: BankType.TBANK,
        cardNumber: '+79001234568',
        recipientName: 'IVAN IVANOV',
        phoneNumber: '+79001234568',
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        isArchived: false
      }
    });
    console.log('✓ Создан реквизит СБП (Тинькофф) на БТ-входе (без устройства)');
    
    // Проверяем результат
    const updatedTrader = await db.user.findUnique({
      where: { email: trader.email },
      include: {
        bankDetails: {
          select: {
            id: true,
            bankType: true,
            cardNumber: true,
            deviceId: true,
            methodType: true
          }
        }
      }
    });
    
    console.log(`\nВсего реквизитов создано: ${updatedTrader?.bankDetails.length}`);
    updatedTrader?.bankDetails.forEach(bd => {
      console.log(`  • ${bd.methodType} ${bd.bankType}: ${bd.cardNumber} ${bd.deviceId ? '(на устройстве)' : '(БТ-вход)'}`);
    });
    
  } catch (error) {
    console.error('Ошибка при создании реквизитов:', error);
  }
}

setupRequisites()
  .catch(console.error)
  .finally(() => db.$disconnect());