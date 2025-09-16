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
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  return response.json();
}

async function simulateTraderActivity() {
  console.log('🚀 Simulating realistic trader activity...');

  try {
    // Get trader
    const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
    if (!trader) {
      console.log('❌ Trader not found');
      return;
    }

    console.log('💰 Current trader balance:', {
      balanceRub: trader.balanceRub,
      balanceUsdt: trader.balanceUsdt,
      frozenRub: trader.frozenRub,
      frozenUsdt: trader.frozenUsdt
    });

    // 1. Add initial balance to trader (simulate deposits)
    console.log('\n💳 Adding initial balance...');
    await db.user.update({
      where: { id: trader.id },
      data: {
        balanceRub: 1000000, // 1M RUB for testing
        balanceUsdt: 15000,  // 15K USDT
      }
    });
    console.log('✅ Added initial balance: 1,000,000 RUB and 15,000 USDT');

    // 2. Create bank details first (needed for transactions)
    console.log('\n💳 Creating bank details...');
    const bankDetails = [];
    const banks = [
      { type: 'SBERBANK', holder: 'Иванов Иван Иванович', card: '4276123456789012' },
      { type: 'VTB', holder: 'Петров Петр Петрович', card: '4272123456789013' },
      { type: 'ALFABANK', holder: 'Сидоров Сидор Сидорович', card: '4154123456789014' }
    ];

    for (const bank of banks) {
      try {
        const bankDetail = await db.bankDetail.create({
          data: {
            userId: trader.id,
            methodType: 'card',
            bankType: bank.type,
            cardNumber: bank.card,
            recipientName: bank.holder,
            minAmount: 100,
            maxAmount: 500000,
            dailyLimit: 1000000,
            monthlyLimit: 10000000,
            isActive: true,
            isArchived: false
          }
        });
        bankDetails.push(bankDetail);
        console.log(`✅ Created bank detail: ${bank.type} ${bank.card.slice(-4)}`);
      } catch (error) {
        console.error(`❌ Failed to create bank detail ${bank.type}:`, error);
      }
    }

    // 3. Get or create merchant and method
    console.log('\n🏪 Setting up merchant and method...');
    let merchant = await db.merchant.findFirst();
    if (!merchant) {
      const merchantUser = await db.user.create({
        data: {
          email: 'merchant@test.com',
          password: 'test123',
          name: 'Test Merchant',
          balanceUsdt: 50000,
          balanceRub: 5000000,
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
      console.log('✅ Created test merchant');
    } else {
      console.log('✅ Using existing merchant');
    }

    let method = await db.method.findFirst({ where: { isEnabled: true } });
    if (!method) {
      method = await db.method.create({
        data: {
          code: 'CARD_RUB',
          name: 'Card RUB',
          type: 'card',
          commissionPayin: 2.5,
          commissionPayout: 1.5,
          maxPayin: 500000,
          minPayin: 100,
          maxPayout: 1000000,
          minPayout: 500,
          chancePayin: 90,
          chancePayout: 85,
          isEnabled: true
        }
      });
      console.log('✅ Created payment method');
    } else {
      console.log('✅ Using existing method');
    }

    // 4. Create realistic transactions and simulate acceptance/completion
    console.log('\n💼 Creating and processing transactions...');
    const transactions = [];

    for (let i = 0; i < 15; i++) {
      const amount = Math.floor(Math.random() * 50000) + 1000;
      const status = i < 5 ? 'COMPLETED' : i < 10 ? 'IN_PROGRESS' : i < 12 ? 'READY' : 'CREATED';
      
      try {
        const transaction = await db.transaction.create({
          data: {
            merchantId: merchant.id,
            methodId: method.id,
            userId: trader.id,
            traderId: trader.id,
            amount,
            assetOrBank: 'RUB',
            orderId: `ORDER-${Date.now()}-${i}`,
            currency: 'RUB',
            userIp: '127.0.0.1',
            callbackUri: merchant.callbackUrl,
            successUri: merchant.successUrl,
            failUri: merchant.failUrl,
            type: 'IN',
            expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            commission: 2.5,
            clientName: `Клиент ${i + 1}`,
            status,
            rate: 90,
            acceptedAt: status !== 'CREATED' ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null,
            bankDetailId: bankDetails[i % bankDetails.length]?.id,
            completedAt: status === 'COMPLETED' ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000) : null
          }
        });
        
        transactions.push(transaction);
        
        // For completed transactions, add profit to trader balance
        if (status === 'COMPLETED') {
          const profit = Math.floor(amount * 0.025); // 2.5% commission
          await db.user.update({
            where: { id: trader.id },
            data: {
              balanceRub: { increment: profit },
              totalProfit: { increment: profit }
            }
          });
          console.log(`✅ Completed transaction: ${transaction.orderId} (+${profit}₽ profit)`);
        } else {
          console.log(`✅ Created transaction: ${transaction.orderId} (${status})`);
        }
      } catch (error) {
        console.error(`❌ Failed to create transaction ${i}:`, error);
      }
    }

    // 5. Create new payouts that can be accepted
    console.log('\n💸 Creating new payouts...');
    for (let i = 0; i < 8; i++) {
      const amount = Math.floor(Math.random() * 100000) + 5000;
      const status = i < 2 ? 'CREATED' : i < 4 ? 'ACTIVE' : i < 6 ? 'CHECKING' : 'COMPLETED';
      
      try {
        const payout = await db.payout.create({
          data: {
            merchantId: merchant.id,
            traderId: status === 'CREATED' ? null : trader.id, // Only assigned if not CREATED
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
            acceptedAt: status !== 'CREATED' ? new Date() : null,
            completedAt: status === 'COMPLETED' ? new Date() : null
          }
        });

        console.log(`✅ Created payout: ${payout.id} (${status}) - ${amount}₽`);
      } catch (error) {
        console.error(`❌ Failed to create payout ${i}:`, error);
      }
    }

    // 6. Now test accepting a payout via API
    console.log('\n🎯 Testing payout acceptance...');
    try {
      const availablePayouts = await db.payout.findMany({
        where: { status: 'CREATED' },
        take: 1
      });

      if (availablePayouts.length > 0) {
        const payoutToAccept = availablePayouts[0];
        console.log(`Attempting to accept payout ${payoutToAccept.id} for ${payoutToAccept.amount}₽`);
        
        const acceptResult = await apiCall(`/trader/payouts/${payoutToAccept.id}/accept`, 'POST');
        console.log('✅ Payout acceptance successful:', acceptResult);
      } else {
        console.log('⚠️ No available payouts to accept');
      }
    } catch (error) {
      console.error('❌ Failed to accept payout:', error);
    }

    // 7. Check final trader balance
    const finalTrader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
    console.log('\n📊 Final trader balance:', {
      balanceRub: finalTrader?.balanceRub,
      balanceUsdt: finalTrader?.balanceUsdt,
      frozenRub: finalTrader?.frozenRub,
      frozenUsdt: finalTrader?.frozenUsdt,
      totalProfit: finalTrader?.totalProfit || 0
    });

    console.log('\n🎉 Trader activity simulation completed successfully!');
    console.log('\n📈 Summary:');
    console.log('- Added initial balance: 1M RUB + 15K USDT');
    console.log('- Created 3 bank details');
    console.log('- Created 15 transactions (5 completed with profits)');
    console.log('- Created 8 payouts (2 available for acceptance)');
    console.log('- Tested payout acceptance via API');

  } catch (error) {
    console.error('❌ Error simulating trader activity:', error);
  } finally {
    await db.$disconnect();
  }
}

simulateTraderActivity();