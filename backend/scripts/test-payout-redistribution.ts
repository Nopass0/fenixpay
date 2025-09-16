#!/usr/bin/env bun
import { db } from '../src/db';
import { PayoutStatus } from '@prisma/client';

async function testPayoutRedistribution() {
  console.log('🧪 Testing Payout Redistribution Service...\n');

  try {
    // Check if we have a test merchant
    let merchant = await db.merchant.findFirst({
      where: { name: 'Test Merchant' }
    });

    if (!merchant) {
      console.log('📦 Creating test merchant...');
      merchant = await db.merchant.create({
        data: {
          name: 'Test Merchant',
          token: 'test-merchant-token-' + Date.now()
        }
      });
    }

    // Check if we have test traders
    const traders = await db.user.findMany({
      where: {
        email: { startsWith: 'test-trader-' },
        banned: false
      }
    });

    if (traders.length < 5) {
      console.log('📦 Creating test traders...');
      const tradersToCreate = [];
      for (let i = traders.length + 1; i <= 5; i++) {
        tradersToCreate.push({
          email: `test-trader-${i}@example.com`,
          password: 'password123',
          name: `Test Trader ${i}`,
          banned: false,
          trafficEnabled: true,
          payoutBalance: 500000 + (i * 100000), // Different balances
          frozenPayoutBalance: 0,
          maxSimultaneousPayouts: 5,
          balanceUsdt: 5000 + (i * 1000),
          balanceRub: 0
        });
      }
      await db.user.createMany({ data: tradersToCreate });
    }

    // Get or create a method
    let method = await db.method.findFirst();
    if (!method) {
      console.log('📦 Creating test method...');
      method = await db.method.create({
        data: {
          code: 'CARD_TRANSFER',
          name: 'Card Transfer',
          type: 'c2c',
          commissionPayin: 1.5,
          commissionPayout: 1.5,
          maxPayin: 1000000,
          minPayin: 100,
          maxPayout: 1000000,
          minPayout: 100,
          chancePayin: 95,
          chancePayout: 95,
          isEnabled: true
        }
      });
    }

    // Create merchant-trader relationships
    const allTraders = await db.user.findMany({
      where: {
        email: { startsWith: 'test-trader-' }
      }
    });

    console.log('📦 Creating merchant-trader relationships...');
    for (const trader of allTraders) {
      const existing = await db.traderMerchant.findFirst({
        where: {
          traderId: trader.id,
          merchantId: merchant.id,
          methodId: method.id
        }
      });

      if (!existing) {
        await db.traderMerchant.create({
          data: {
            traderId: trader.id,
            merchantId: merchant.id,
            methodId: method.id,
            isMerchantEnabled: true
          }
        });
      }
    }

    // Clean up old test payouts
    console.log('🧹 Cleaning up old test payouts...');
    await db.payout.deleteMany({
      where: {
        wallet: { startsWith: 'test-wallet-' }
      }
    });

    // Run performance test directly
    console.log('\n⏱️  Running performance test with 1,000 payouts...');
    
    // Import and run the test directly
    const PayoutRedistributionServiceModule = await import('../src/services/PayoutRedistributionService');
    const PayoutRedistributionService = PayoutRedistributionServiceModule.default;
    const service = new PayoutRedistributionService();
    
    // Mock the logger methods for testing
    service['logInfo'] = async () => {};
    service['logDebug'] = async () => {};
    service['logError'] = async () => {};
    
    const result = await service.testPerformance(1000, merchant.id);
    
    console.log('\n✅ Performance Test Results:');
    console.log(`   - Total payouts: 1,000`);
    console.log(`   - Payouts assigned: ${result.assigned}`);
    console.log(`   - Time taken: ${result.duration}ms`);
    console.log(`   - Performance: ${result.duration < 5000 ? '✅ PASS' : '❌ FAIL'} (target: < 5000ms)`);
    
    if (result.duration >= 5000) {
      console.log(`\n⚠️  Performance target not met. Consider optimizing the service.`);
    }

    // Test normal operation
    console.log('\n🔄 Testing normal redistribution cycle...');
    
    // Create a few unassigned payouts
    const testPayouts = [];
    for (let i = 1; i <= 10; i++) {
      const payout = await db.payout.create({
        data: {
          merchantId: merchant.id,
          amount: 10000 + (i * 1000),
          amountUsdt: 100 + (i * 10),
          total: 11000 + (i * 1000),
          totalUsdt: 110 + (i * 10),
          rate: 100,
          merchantRate: 100,
          wallet: `test-normal-wallet-${i}`,
          bank: 'Sberbank',
          isCard: true,
          status: PayoutStatus.CREATED,
          expireAt: new Date(Date.now() + 3600000), // 1 hour from now
          acceptanceTime: 5,
          processingTime: 15,
          direction: 'OUT'
        }
      });
      testPayouts.push(payout);
    }

    // Run redistribution
    await service['redistributePayouts']();
    
    // Check results
    const assignedPayouts = await db.payout.findMany({
      where: {
        id: { in: testPayouts.map(p => p.id) },
        traderId: { not: null }
      }
    });

    console.log(`\n📊 Normal Operation Results:`);
    console.log(`   - Created payouts: ${testPayouts.length}`);
    console.log(`   - Assigned payouts: ${assignedPayouts.length}`);
    console.log(`   - Assignment rate: ${(assignedPayouts.length / testPayouts.length * 100).toFixed(1)}%`);

    // Test exclusion of previous trader
    console.log('\n🔄 Testing previous trader exclusion...');
    
    if (assignedPayouts.length > 0) {
      const payoutToCancel = assignedPayouts[0];
      const originalTraderId = payoutToCancel.traderId;
      
      // Simulate cancellation (return to pool)
      await db.payout.update({
        where: { id: payoutToCancel.id },
        data: {
          status: PayoutStatus.CREATED,
          traderId: null,
          acceptedAt: null,
          cancelReason: `Cancelled by trader | traderId:${originalTraderId}`
        }
      });

      // Restore trader balance
      if (originalTraderId) {
        await db.user.update({
          where: { id: originalTraderId },
          data: {
            payoutBalance: { increment: payoutToCancel.total },
            frozenPayoutBalance: { decrement: payoutToCancel.total }
          }
        });
      }

      // Run redistribution again
      await service['redistributePayouts']();
      
      // Check if assigned to different trader
      const reassignedPayout = await db.payout.findUnique({
        where: { id: payoutToCancel.id }
      });

      if (reassignedPayout?.traderId) {
        console.log(`   ✅ Payout reassigned to different trader`);
        console.log(`   - Original trader: ${originalTraderId}`);
        console.log(`   - New trader: ${reassignedPayout.traderId}`);
        console.log(`   - Exclusion working: ${reassignedPayout.traderId !== originalTraderId ? '✅' : '❌'}`);
      } else {
        console.log(`   ⚠️  Payout not reassigned (might be due to no eligible traders)`);
      }
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await db.payout.deleteMany({
      where: {
        OR: [
          { wallet: { startsWith: 'test-wallet-' } },
          { wallet: { startsWith: 'test-normal-wallet-' } }
        ]
      }
    });

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

testPayoutRedistribution().catch(console.error);