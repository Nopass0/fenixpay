#!/usr/bin/env bun

async function createTestPayouts() {
  const API_URL = 'http://localhost:3000/api';
  const MERCHANT_TOKEN = 'test-payout-merchant';
  
  const payoutData = [
    { amount: 5000, wallet: '79001234567', bank: 'SBER', isCard: true, rate: 98 },
    { amount: 10000, wallet: '41001234567890', bank: 'TINKOFF', isCard: true, rate: 97.5 },
    { amount: 15000, wallet: '79009876543', bank: 'ALFA', isCard: false, rate: 98.2 },
    { amount: 7500, wallet: '41009876543210', bank: 'VTB', isCard: true, rate: 97.8 },
    { amount: 20000, wallet: '79005555555', bank: 'SBER', isCard: false, rate: 98.5 },
    { amount: 3000, wallet: '41005555555555', bank: 'TINKOFF', isCard: true, rate: 97 },
    { amount: 12000, wallet: '79007777777', bank: 'ALFA', isCard: true, rate: 98.3 },
    { amount: 8000, wallet: '41007777777777', bank: 'VTB', isCard: false, rate: 97.7 },
    { amount: 25000, wallet: '79003333333', bank: 'SBER', isCard: true, rate: 98.8 },
    { amount: 6000, wallet: '41003333333333', bank: 'TINKOFF', isCard: false, rate: 97.2 },
  ];
  
  console.log('🚀 Creating 10 test payouts...\n');
  
  for (let i = 0; i < payoutData.length; i++) {
    const data = payoutData[i];
    
    try {
      const response = await fetch(`${API_URL}/merchant/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-api-key': MERCHANT_TOKEN,
        },
        body: JSON.stringify({
          amount: data.amount,
          wallet: data.wallet,
          bank: data.bank,
          isCard: data.isCard,
          merchantRate: data.rate,
          externalReference: `TEST-PAYOUT-${i + 1}`,
          processingTime: 15,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Payout #${i + 1} created:`);
        console.log(`   ID: ${result.payout.id}`);
        console.log(`   Numeric ID: ${result.payout.numericId}`);
        console.log(`   Amount: ${result.payout.amount} RUB (${result.payout.amountUsdt} USDT)`);
        console.log(`   Bank: ${result.payout.bank}`);
        console.log(`   Status: ${result.payout.status}`);
        console.log(`   Expires at: ${new Date(result.payout.expireAt).toLocaleString()}\n`);
      } else {
        console.log(`❌ Failed to create payout #${i + 1}: ${result.error}\n`);
      }
    } catch (error) {
      console.log(`❌ Error creating payout #${i + 1}: ${error.message}\n`);
    }
  }
  
  console.log('✅ Finished creating test payouts!');
}

createTestPayouts().catch(console.error);