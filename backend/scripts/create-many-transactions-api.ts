#!/usr/bin/env bun

import { db } from '../src/db';

const MERCHANT_API_KEY = "test-merchant-token";
const API_BASE = "http://localhost:3000/api";

// Helper for merchant API calls
async function merchantApiCall(endpoint: string, method: string = 'GET', data?: any) {
  const url = `${API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'x-merchant-api-key': MERCHANT_API_KEY,
      'Content-Type': 'application/json'
    }
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  // Handle non-JSON responses
  const text = await response.text();
  let responseData;
  try {
    responseData = text ? JSON.parse(text) : {};
  } catch (e) {
    responseData = { message: text };
  }
  
  if (!response.ok) {
    console.error(`API call failed: ${method} ${endpoint} - ${response.status}`, responseData);
    throw new Error(`API call failed: ${response.status} - ${JSON.stringify(responseData)}`);
  }
  
  return responseData;
}

async function createManyTransactions() {
  console.log('🚀 Creating many transactions and payouts via API...');

  try {
    // Get method
    const methods = await merchantApiCall('/merchant/methods');
    const payinMethod = methods.find((m: any) => m.code === 'C2C_RUB_IN');
    const payoutMethod = methods.find((m: any) => m.code === 'SBP_RUB_OUT');

    if (!payinMethod || !payoutMethod) {
      console.log('❌ Methods not found');
      return;
    }

    console.log('✅ Found methods:', { payin: payinMethod.name, payout: payoutMethod.name });

    // Create incoming transactions (deposits)
    console.log('\n💸 Creating incoming transactions...');
    const incomingAmounts = [
      15000, 25000, 35000, 45000, 55000, 65000, 75000, 85000, 95000, 105000,
      12000, 23000, 34000, 47000, 58000, 69000, 78000, 89000, 98000, 112000,
      18000, 28000, 38000, 48000, 62000, 72000, 82000, 92000, 102000, 122000
    ];

    let successfulTransactions = 0;
    for (let i = 0; i < incomingAmounts.length; i++) {
      try {
        const transaction = await merchantApiCall('/merchant/transactions', 'POST', {
          methodId: payinMethod.id,
          amount: incomingAmounts[i],
          currency: 'RUB',
          userIp: `192.168.1.${100 + i}`,
          orderId: `DEPOSIT-${Date.now()}-${i}`,
          clientName: `Клиент ${i + 1}`,
          callbackUri: 'https://merchant.test/callback',
          successUri: 'https://merchant.test/success', 
          failUri: 'https://merchant.test/fail'
        });
        
        console.log(`✅ Created transaction: ${transaction.orderId} - ${incomingAmounts[i]}₽`);
        successfulTransactions++;
      } catch (error) {
        console.error(`❌ Failed to create transaction ${i}:`, error);
      }
    }

    // Create outgoing transactions (payouts)
    console.log('\n💰 Creating payout requests...');
    const payoutAmounts = [
      45000, 55000, 65000, 75000, 85000, 95000, 105000, 115000, 125000, 135000,
      42000, 52000, 67000, 77000, 87000, 97000, 107000, 117000, 127000, 145000
    ];

    let successfulPayouts = 0;
    for (let i = 0; i < payoutAmounts.length; i++) {
      try {
        const payout = await merchantApiCall('/merchant/payouts', 'POST', {
          amount: payoutAmounts[i],
          wallet: `TRC${Math.random().toString(36).slice(2, 11).toUpperCase()}${Math.floor(Math.random() * 100000)}`,
          bank: ['SBERBANK', 'VTB', 'ALFABANK'][i % 3],
          isCard: true,
          merchantRate: 90 + Math.random() * 2 // 90-92 rate
        });
        
        console.log(`✅ Created payout: ${payout.id} - ${payoutAmounts[i]}₽`);
        successfulPayouts++;
      } catch (error) {
        console.error(`❌ Failed to create payout ${i}:`, error);
      }
    }

    // Get trader balance to show results
    const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
    
    console.log('\n📊 Summary:');
    console.log(`- Created ${successfulTransactions} incoming transactions`);
    console.log(`- Created ${successfulPayouts} payout requests`);
    console.log(`- Trader balance: ${trader?.balanceRub}₽ / ${trader?.balanceUsdt} USDT`);
    
    console.log('\n🎉 Finished creating transactions via API!');

  } catch (error) {
    console.error('❌ Error creating transactions:', error);
  } finally {
    await db.$disconnect();
  }
}

createManyTransactions();