#!/usr/bin/env bun

import { db } from '../src/db';

const TRADER_TOKEN = "5872cb3c8d38aa6fd4c2bb1640f101f66ae4f320c38e06cfb7f8c5e705423783";
const API_BASE = "http://localhost:3000/api";

// Helper function to make API calls
async function apiCall(endpoint: string, method: string = 'GET', data?: any, headers?: any) {
  const url = `${API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API call failed: ${method} ${endpoint} - ${response.status} ${response.statusText} - ${errorText}`);
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  return response.json();
}

async function setupRealisticEcosystem() {
  console.log('🚀 Setting up realistic trading ecosystem...');

  try {
    // 1. Clear all existing data (respecting foreign key constraints)
    console.log('\n🗑️ Clearing existing data...');
    await db.notification.deleteMany();
    await db.withdrawalDispute.deleteMany();
    await db.transaction.deleteMany();
    await db.payout.deleteMany();
    await db.message.deleteMany();
    
    // Clear folders (they will disconnect from bank details automatically)
    await db.folder.deleteMany();
    await db.bankDetail.deleteMany();
    await db.device.deleteMany();
    
    // Clear trader-merchant relations
    await db.traderMerchant.deleteMany();
    
    console.log('✅ All data cleared');

    // 2. Get trader
    const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
    if (!trader) {
      console.log('❌ Trader not found');
      return;
    }

    // 3. Set initial trader balance and settings
    console.log('\n💰 Setting trader balance and settings...');
    await db.user.update({
      where: { id: trader.id },
      data: {
        balanceRub: 2000000, // 2M RUB initial balance
        balanceUsdt: 25000,  // 25K USDT
        frozenRub: 0,
        frozenUsdt: 0,
        deposit: 500000,     // 500K deposit (correct field name)
        profitFromDeals: 0,
        profitPercent: 2.5,  // 2.5% profit percent
        stakePercent: 15,    // 15% stake percent
        maxSimultaneousPayouts: 10,
        trustBalance: 2500000, // Initial trust balance
        payoutBalance: 1000000 // Payout balance
      }
    });
    console.log('✅ Trader balance set: 2M RUB, 25K USDT, 500K deposit, 2.5% profit, 15% stake');

    // 4. Create or update merchant and admin
    console.log('\n🏪 Setting up merchant...');
    let merchant = await db.merchant.findFirst();
    let merchantUser = await db.user.findFirst({ where: { email: 'merchant@test.com' } });
    
    if (!merchantUser) {
      merchantUser = await db.user.create({
        data: {
          email: 'merchant@test.com',
          password: 'test123',
          name: 'Test Merchant',
          balanceUsdt: 100000,
          balanceRub: 10000000,
          frozenUsdt: 0,
          frozenRub: 0
        }
      });
    }

    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          name: 'Test Trading Company',
          userId: merchantUser.id,
          isActive: true,
          domain: 'trading.test.com',
          apiKey: 'merchant-api-key-12345',
          callbackUrl: 'https://trading.test.com/callback',
          successUrl: 'https://trading.test.com/success',
          failUrl: 'https://trading.test.com/fail'
        }
      });
    }
    console.log('✅ Merchant setup complete');

    // 5. Create payment methods with proper rates
    console.log('\n💳 Creating payment methods...');
    // Don't delete existing methods to avoid foreign key issues
    
    const methods = [
      {
        code: 'C2C_RUB_IN',
        name: 'C2C RUB (Ввод)',
        type: 'c2c',
        commissionPayin: 3.5,    // 3.5% commission for incoming
        commissionPayout: 0,
        maxPayin: 500000,
        minPayin: 1000,
        maxPayout: 0,
        minPayout: 0,
        chancePayin: 95,
        chancePayout: 0,
        isEnabled: true
      },
      {
        code: 'SBP_RUB_OUT',
        name: 'СБП RUB (Вывод)',
        type: 'sbp',
        commissionPayin: 0,
        commissionPayout: 2.0,   // 2% commission for outgoing
        maxPayin: 0,
        minPayin: 0,
        maxPayout: 1000000,
        minPayout: 5000,
        chancePayin: 0,
        chancePayout: 90,
        isEnabled: true
      }
    ];

    const createdMethods = [];
    for (const methodData of methods) {
      // Try to find existing method first
      let method = await db.method.findFirst({ where: { code: methodData.code } });
      if (!method) {
        method = await db.method.create({ data: methodData });
        console.log(`✅ Created method: ${method.name}`);
      } else {
        // Update existing method
        method = await db.method.update({
          where: { id: method.id },
          data: methodData
        });
        console.log(`✅ Updated method: ${method.name}`);
      }
      createdMethods.push(method);
    }

    // 6. Create devices for trader
    console.log('\n📱 Creating trader devices...');
    const devices = [
      { name: 'Samsung Galaxy S23 Ultra (SM-S918B)', isOnline: true },
      { name: 'iPhone 15 Pro Max (A3108)', isOnline: true },
      { name: 'Xiaomi 14 Pro (23116PN5BC)', isOnline: false }
    ];

    const createdDevices = [];
    for (const deviceData of devices) {
      const device = await db.device.create({
        data: {
          name: deviceData.name,
          isOnline: deviceData.isOnline,
          userId: trader.id,
          token: `device-token-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          lastActiveAt: deviceData.isOnline ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000),
          fcmToken: `fcm-${Math.random().toString(36).slice(2)}`,
          emulated: false,
          pushEnabled: true,
          energy: Math.random() * 100 + 20, // 20-120% battery
          ethernetSpeed: Math.random() * 100 + 50 // 50-150 Mbps
        }
      });
      createdDevices.push(device);
      console.log(`✅ Created device: ${device.name}`);
    }

    // 7. Create bank details for trader
    console.log('\n🏦 Creating bank details...');
    const bankDetails = [
      { 
        methodType: 'c2c', 
        bankType: 'SBERBANK', 
        cardNumber: '4276123456789012', 
        recipientName: 'Иванов Иван Иванович',
        minAmount: 1000,
        maxAmount: 500000,
        dailyLimit: 2000000,
        monthlyLimit: 50000000
      },
      { 
        methodType: 'c2c', 
        bankType: 'VTB', 
        cardNumber: '4272987654321098', 
        recipientName: 'Петров Петр Петрович',
        minAmount: 1000,
        maxAmount: 300000,
        dailyLimit: 1500000,
        monthlyLimit: 30000000
      },
      { 
        methodType: 'sbp', 
        bankType: 'ALFABANK', 
        cardNumber: '4154567890123456', 
        recipientName: 'Сидоров Сидор Сидорович',
        minAmount: 1000,
        maxAmount: 400000,
        dailyLimit: 1800000,
        monthlyLimit: 40000000
      }
    ];

    const createdBankDetails = [];
    for (const bankData of bankDetails) {
      const bankDetail = await db.bankDetail.create({
        data: {
          ...bankData,
          userId: trader.id,
          dailyTraffic: 0,
          monthlyTraffic: 0,
          intervalMinutes: 60
        }
      });
      createdBankDetails.push(bankDetail);
      console.log(`✅ Created bank detail: ${bankDetail.bankType} *${bankDetail.cardNumber.slice(-4)}`);
    }

    // 8. Create folders and assign bank details
    console.log('\n📁 Creating folders...');
    const folders = [
      { name: 'Основные карты', bankDetailIds: [createdBankDetails[0].id, createdBankDetails[1].id] },
      { name: 'Резервные карты', bankDetailIds: [createdBankDetails[2].id] }
    ];

    for (const folderData of folders) {
      const folder = await db.folder.create({
        data: {
          title: folderData.name,
          trader: {
            connect: { id: trader.id }
          },
          requisites: {
            create: folderData.bankDetailIds.map(id => ({
              requisite: { connect: { id } }
            }))
          }
        }
      });
      console.log(`✅ Created folder: ${folder.title}`);
    }

    // 9. Generate realistic incoming transactions via merchant API
    console.log('\n💸 Creating realistic transactions via merchant API...');
    
    const payinMethod = createdMethods.find(m => m.code === 'C2C_RUB_IN');
    if (!payinMethod) {
      throw new Error('Payin method not found');
    }

    // Create transactions with different statuses
    const transactionAmounts = [25000, 45000, 12000, 78000, 33000, 67000, 15000, 89000, 23000, 56000];
    const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'READY', 'READY', 'CREATED', 'COMPLETED', 'IN_PROGRESS', 'READY'];
    
    for (let i = 0; i < transactionAmounts.length; i++) {
      const amount = transactionAmounts[i];
      const status = statuses[i];
      
      try {
        const transaction = await db.transaction.create({
          data: {
            merchantId: merchant.id,
            methodId: payinMethod.id,
            userId: merchantUser.id,
            traderId: status !== 'CREATED' ? trader.id : null,
            amount,
            assetOrBank: 'RUB',
            orderId: `ORDER-${Date.now()}-${i}`,
            currency: 'RUB',
            userIp: '192.168.1.100',
            callbackUri: merchant.callbackUrl || 'https://test.com/callback',
            successUri: merchant.successUrl || 'https://test.com/success',
            failUri: merchant.failUrl || 'https://test.com/fail',
            type: 'IN',
            expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            commission: payinMethod.commissionPayin,
            clientName: `Клиент ${i + 1}`,
            status,
            rate: 90 + Math.random() * 5, // 90-95 rate
            kkkPercent: 15, // 15% KKK
            acceptedAt: status !== 'CREATED' ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000) : null,
            bankDetailId: status !== 'CREATED' ? createdBankDetails[i % createdBankDetails.length].id : null,
            completedAt: status === 'COMPLETED' ? new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000) : null,
            frozenUsdtAmount: status !== 'CREATED' ? amount / 90 : 0,
            calculatedCommission: status !== 'CREATED' ? (amount * payinMethod.commissionPayin) / 100 : 0
          }
        });

        // Update trader balances for completed transactions
        if (status === 'COMPLETED') {
          const profit = (amount * payinMethod.commissionPayin) / 100;
          await db.user.update({
            where: { id: trader.id },
            data: {
              profitFromDeals: { increment: profit },
              balanceUsdt: { increment: profit / 90 }
            }
          });
        }

        console.log(`✅ Created transaction: ${transaction.orderId} (${status}) - ${amount}₽`);
      } catch (error) {
        console.error(`❌ Failed to create transaction ${i}:`, error);
      }
    }

    // 10. Create realistic payouts
    console.log('\n💰 Creating payouts...');
    const payoutMethod = createdMethods.find(m => m.code === 'SBP_RUB_OUT');
    if (!payoutMethod) {
      throw new Error('Payout method not found');
    }

    const payoutAmounts = [75000, 45000, 120000, 35000, 89000, 67000];
    const payoutStatuses = ['CREATED', 'CREATED', 'ACTIVE', 'CHECKING', 'COMPLETED', 'COMPLETED'];

    for (let i = 0; i < payoutAmounts.length; i++) {
      const amount = payoutAmounts[i];
      const status = payoutStatuses[i];
      
      try {
        const payout = await db.payout.create({
          data: {
            merchantId: merchant.id,
            traderId: status === 'CREATED' ? null : trader.id,
            amount,
            amountUsdt: Math.round(amount / 90 * 100) / 100,
            total: amount,
            totalUsdt: Math.round(amount / 90 * 100) / 100,
            rate: 90,
            wallet: `TRC${Math.random().toString(36).slice(2, 11).toUpperCase()}${Math.floor(Math.random() * 100000)}`,
            bank: ['SBERBANK', 'VTB', 'ALFABANK'][i % 3],
            isCard: true,
            status,
            expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            acceptedAt: status !== 'CREATED' ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000) : null,
            completedAt: status === 'COMPLETED' ? new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000) : null
          }
        });

        console.log(`✅ Created payout: ${payout.id} (${status}) - ${amount}₽`);
      } catch (error) {
        console.error(`❌ Failed to create payout ${i}:`, error);
      }
    }

    // 11. Create device notifications
    console.log('\n📲 Creating device notifications...');
    for (const device of createdDevices) {
      for (let i = 0; i < 5; i++) {
        try {
          const apps = ['ru.sberbankmobile', 'ru.vtb24.mobilebanking.android', 'com.idamob.tinkoff.android'];
          const amounts = [12000, 45000, 0, 78000, 23000];
          
          await db.notification.create({
            data: {
              deviceId: device.id,
              type: 'SMS',
              title: `Уведомление ${i + 1}`,
              message: `Операция на сумму ${amounts[i]}₽ выполнена успешно. Баланс обновлен.`,
              application: apps[i % apps.length],
              isRead: Math.random() > 0.3,
              metadata: amounts[i] > 0 ? { amount: amounts[i] } : null
            }
          });
        } catch (error) {
          console.error(`❌ Failed to create notification for device ${device.name}:`, error);
        }
      }
      console.log(`✅ Created notifications for device: ${device.name}`);
    }

    // 12. Create trader messages
    console.log('\n💬 Creating trader messages...');
    const messageTypes = ['SYSTEM', 'TRANSACTION', 'PAYOUT', 'ANNOUNCEMENT'];
    const messageTexts = [
      'Добро пожаловать в систему! Ваш аккаунт успешно активирован.',
      'Новая транзакция принята в работу. Сумма: 45,000₽',
      'Выплата #12345 готова к обработке. Проверьте детали.',
      'Обновление системы запланировано на 02:00. Возможны кратковременные сбои.',
      'Ваш баланс пополнен на 125,000₽. Средства доступны.',
      'Новые требования по безопасности вступают в силу с понедельника.',
      'Транзакция #67890 завершена успешно. Комиссия: 1,575₽',
      'Техническое обслуживание завершено. Все системы работают нормально.'
    ];

    for (let i = 0; i < messageTexts.length; i++) {
      try {
        await db.message.create({
          data: {
            userId: trader.id,
            text: messageTexts[i],
            type: messageTypes[i % messageTypes.length],
            isRead: Math.random() > 0.4
          }
        });
      } catch (error) {
        console.error(`❌ Failed to create message ${i}:`, error);
      }
    }
    console.log('✅ Created trader messages');

    // 13. Final balance check
    const finalTrader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
    console.log('\n📊 Final trader state:', {
      balanceRub: finalTrader?.balanceRub,
      balanceUsdt: finalTrader?.balanceUsdt,
      frozenRub: finalTrader?.frozenRub,
      frozenUsdt: finalTrader?.frozenUsdt,
      depositSum: finalTrader?.depositSum,
      profitFromDeals: finalTrader?.profitFromDeals,
      kkkPercent: finalTrader?.kkkPercent
    });

    console.log('\n🎉 Realistic trading ecosystem setup completed successfully!');
    console.log('\n📈 Summary:');
    console.log('- Set trader balance: 2M RUB + 25K USDT + 500K deposit');
    console.log('- Created payment methods with proper commissions');
    console.log('- Created 3 devices with notifications');
    console.log('- Created 3 bank details in 2 folders');
    console.log('- Created 10 realistic transactions (various statuses)');
    console.log('- Created 6 payouts (2 available for acceptance)');
    console.log('- Created device notifications and trader messages');
    console.log('- Set 15% KKK for trader');

  } catch (error) {
    console.error('❌ Error setting up ecosystem:', error);
  } finally {
    await db.$disconnect();
  }
}

setupRealisticEcosystem();