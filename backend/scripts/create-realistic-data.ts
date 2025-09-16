#!/usr/bin/env bun

import { db } from '../src/db';

const TRADER_TOKEN = "5872cb3c8d38aa6fd4c2bb1640f101f66ae4f320c38e06cfb7f8c5e705423783";
const API_BASE = "http://localhost:3000/api";

// Helper function to make API calls
async function apiCall(endpoint: string, method: string = 'GET', data?: any) {
  const url = `${API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'x-trader-token': TRADER_TOKEN,
      'Content-Type': 'application/json'
    }
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

async function createRealisticData() {
  console.log('🚀 Creating realistic trader data through API calls...');

  try {
    // 1. Create devices first
    console.log('\n📱 Creating devices...');
    const deviceNames = ['Samsung Galaxy S23', 'iPhone 14 Pro', 'Xiaomi 13'];
    const devices = [];
    
    for (const name of deviceNames) {
      try {
        const device = await apiCall('/trader/devices', 'POST', { name });
        devices.push(device);
        console.log(`✅ Created device: ${name}`);
      } catch (error) {
        console.error(`❌ Failed to create device ${name}:`, error);
      }
    }

    // Wait a bit for devices to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Create bank details (requisites)
    console.log('\n💳 Creating bank details...');
    const bankDetails = [];
    const banks = [
      { type: 'SBERBANK', holder: 'Иванов Иван Иванович', card: '4276123456789012' },
      { type: 'VTB', holder: 'Петров Петр Петрович', card: '4272123456789013' },
      { type: 'ALFABANK', holder: 'Сидоров Сидор Сидорович', card: '4154123456789014' }
    ];

    for (let i = 0; i < banks.length; i++) {
      const bank = banks[i];
      try {
        const requisite = await apiCall('/trader/bank-details', 'POST', {
          methodType: 'c2ckz',
          bankType: bank.type,
          cardNumber: bank.card,
          recipientName: bank.holder,
          minAmount: 100,
          maxAmount: 500000,
          dailyLimit: 1000000,
          monthlyLimit: 10000000,
          deviceId: devices[i % devices.length]?.id
        });
        bankDetails.push(requisite);
        console.log(`✅ Created bank detail: ${bank.type} ${bank.card.slice(-4)}`);
      } catch (error) {
        console.error(`❌ Failed to create bank detail ${bank.type}:`, error);
      }
    }

    // 3. Create folders and add requisites
    console.log('\n📁 Creating folders...');
    const folderNames = ['Основные карты', 'Резервные карты'];
    
    for (let i = 0; i < folderNames.length; i++) {
      try {
        const requisiteIds = bankDetails
          .slice(i, i + 2)
          .map(bd => bd.id)
          .filter(Boolean);

        if (requisiteIds.length > 0) {
          const folder = await apiCall('/trader/folders', 'POST', {
            title: folderNames[i],
            requisiteIds
          });
          console.log(`✅ Created folder: ${folderNames[i]} with ${requisiteIds.length} requisites`);
        }
      } catch (error) {
        console.error(`❌ Failed to create folder ${folderNames[i]}:`, error);
      }
    }

    // 4. Create notifications for devices
    console.log('\n📬 Creating device notifications...');
    for (const device of devices) {
      if (!device?.id) continue;
      
      try {
        // Create notifications through device message API
        for (let i = 0; i < 3; i++) {
          const amount = Math.floor(Math.random() * 50000) + 1000;
          const balance = Math.floor(Math.random() * 100000) + 10000;
          
          await db.notification.create({
            data: {
              deviceId: device.id,
              type: i % 2 === 0 ? 'SMS' : 'AppNotification',
              message: `Перевод ${amount}р. Баланс: ${balance}р.`,
              title: 'Банковское уведомление',
              application: 'com.sberbank.online',
              isRead: false,
              metadata: {
                amount,
                balance,
                timestamp: new Date().toISOString()
              }
            }
          });
        }
        console.log(`✅ Created notifications for device: ${device.name}`);
      } catch (error) {
        console.error(`❌ Failed to create notifications for device ${device.name}:`, error);
      }
    }

    // 5. Create transactions (simulating merchant creating them)
    console.log('\n💰 Creating transactions...');
    
    // Get or create merchant
    let merchant = await db.merchant.findFirst();
    if (!merchant) {
      const merchantUser = await db.user.create({
        data: {
          email: 'merchant@test.com',
          password: 'test123',
          name: 'Test Merchant',
          balanceUsdt: 0,
          balanceRub: 0,
          frozenUsdt: 0,
          frozenRub: 0
        }
      });
      
      merchant = await db.merchant.create({
        data: {
          name: 'Test Merchant',
          userId: merchantUser.id,
          isActive: true,
          domain: 'test.com',
          apiKey: 'test-api-key',
          callbackUrl: 'https://test.com/callback',
          successUrl: 'https://test.com/success',
          failUrl: 'https://test.com/fail'
        }
      });
    }

    // Get methods
    const methods = await db.method.findMany({ where: { isEnabled: true } });
    if (methods.length === 0) {
      console.log('⚠️ No methods found, creating basic method...');
      const method = await db.method.create({
        data: {
          code: 'BASIC_METHOD',
          name: 'Basic Method',
          type: 'c2ckz',
          commissionPayin: 2.5,
          commissionPayout: 1.5,
          maxPayin: 500000,
          minPayin: 100,
          maxPayout: 1000000,
          minPayout: 500,
          chancePayin: 90,
          chancePayout: 85
        }
      });
      methods.push(method);
    }

    const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
    
    // Create transactions with different statuses
    const statuses = ['IN_PROGRESS', 'READY', 'CREATED'];
    
    for (let i = 0; i < 10; i++) {
      const status = statuses[i % statuses.length];
      const amount = Math.floor(Math.random() * 50000) + 1000;
      
      try {
        const transaction = await db.transaction.create({
          data: {
            merchantId: merchant.id,
            methodId: methods[0].id,
            userId: trader!.id,
            traderId: trader!.id,
            amount,
            assetOrBank: 'RUB',
            orderId: `ORDER-${Date.now()}-${i}`,
            currency: 'RUB',
            userIp: '127.0.0.1',
            callbackUri: merchant.callbackUrl,
            successUri: merchant.successUrl,
            failUri: merchant.failUrl,
            type: 'IN',
            expired_at: status === 'IN_PROGRESS' 
              ? new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
              : new Date(Date.now() + 24 * 60 * 60 * 1000),
            commission: 2.5,
            clientName: `Клиент ${i + 1}`,
            status,
            rate: 90,
            acceptedAt: status !== 'CREATED' ? new Date() : null,
            bankDetailId: bankDetails[i % bankDetails.length]?.id
          }
        });

        console.log(`✅ Created transaction: ${transaction.orderId} (${status})`);
      } catch (error) {
        console.error(`❌ Failed to create transaction ${i}:`, error);
      }
    }

    // 6. Create payouts
    console.log('\n💸 Creating payouts...');
    const payoutStatuses = ['CREATED', 'ACTIVE', 'CHECKING', 'COMPLETED'];
    
    for (let i = 0; i < 6; i++) {
      const status = payoutStatuses[i % payoutStatuses.length];
      const amount = Math.floor(Math.random() * 100000) + 5000;
      
      try {
        const payout = await db.payout.create({
          data: {
            merchantId: merchant.id,
            traderId: trader!.id,
            amount,
            amountUsdt: amount / 90,
            total: amount,
            totalUsdt: amount / 90,
            rate: 90,
            wallet: `T${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
            bank: ['SBERBANK', 'VTB', 'ALFABANK'][i % 3],
            isCard: true,
            status,
            expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        });

        console.log(`✅ Created payout: ${payout.id} (${status}) - ${amount}₽`);
      } catch (error) {
        console.error(`❌ Failed to create payout ${i}:`, error);
      }
    }

    // 7. Create trader messages
    console.log('\n💬 Creating trader messages...');
    const messageTypes = ['SYSTEM', 'TRANSACTION', 'PAYOUT', 'ANNOUNCEMENT'];
    
    for (let i = 0; i < 8; i++) {
      const type = messageTypes[i % messageTypes.length];
      try {
        const message = await db.message.create({
          data: {
            traderId: trader!.id,
            subject: `${type} сообщение ${i + 1}`,
            content: `Это тестовое сообщение типа ${type}. Содержимое сообщения номер ${i + 1}.`,
            type,
            priority: i < 2 ? 'URGENT' : 'NORMAL',
            isRead: i > 4
          }
        });

        console.log(`✅ Created message: ${message.subject}`);
      } catch (error) {
        console.error(`❌ Failed to create message ${i}:`, error);
      }
    }

    console.log('\n🎉 Realistic trader data created successfully!');
    console.log('\n📊 Summary:');
    console.log('- 3 devices with notifications');
    console.log('- 3 bank details (requisites)');
    console.log('- 2 folders with requisites');
    console.log('- 10 transactions (IN_PROGRESS, READY, CREATED)');
    console.log('- 6 payouts with different statuses');
    console.log('- 8 trader messages');

  } catch (error) {
    console.error('❌ Error creating realistic data:', error);
  } finally {
    await db.$disconnect();
  }
}

createRealisticData();