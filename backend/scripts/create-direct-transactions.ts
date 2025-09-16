#!/usr/bin/env bun

import { db } from '../src/db';
import { Status, TransactionType } from '@prisma/client';

async function createDirectTransactions() {
  console.log('🚀 Creating transactions directly in database...');

  try {
    const merchant = await db.merchant.findFirst({ where: { name: 'Test Merchant' } });
    const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
    
    if (!merchant || !trader) {
      console.log('❌ Merchant or trader not found');
      return;
    }

    // Get methods
    const c2cMethod = await db.method.findFirst({ where: { code: 'C2C_RUB_IN' } });
    const sbpMethod = await db.method.findFirst({ where: { code: 'SBP_RUB_OUT' } });

    if (!c2cMethod || !sbpMethod) {
      console.log('❌ Methods not found');
      return;
    }

    // Get a bank detail for transactions
    const bankDetail = await db.bankDetail.findFirst({
      where: { 
        userId: trader.id,
        methodType: c2cMethod.type
      }
    });

    // Create incoming transactions
    console.log('\n💸 Creating incoming transactions...');
    const incomingAmounts = [
      15000, 25000, 35000, 45000, 55000, 65000, 75000, 85000, 95000, 105000,
      12000, 23000, 34000, 47000, 58000, 69000, 78000, 89000, 98000, 112000
    ];

    const statuses = [Status.CREATED, Status.IN_PROGRESS, Status.READY, Status.COMPLETED];
    const now = new Date();

    for (let i = 0; i < incomingAmounts.length; i++) {
      const status = statuses[i % statuses.length];
      const createdAt = new Date(now.getTime() - (i * 3600000)); // Stagger by hours
      
      const transaction = await db.transaction.create({
        data: {
          merchantId: merchant.id,
          traderId: status !== Status.CREATED ? trader.id : undefined,
          amount: incomingAmounts[i],
          assetOrBank: 'SBERBANK',
          orderId: `ORDER-${Date.now()}-${i}`,
          currency: 'RUB',
          userId: merchant.id,
          userIp: `192.168.1.${100 + i}`,
          callbackUri: 'https://merchant.test/callback',
          successUri: 'https://merchant.test/success',
          failUri: 'https://merchant.test/fail',
          type: TransactionType.IN,
          expired_at: new Date(Date.now() + 86400000), // 24 hours
          commission: incomingAmounts[i] * 0.025,
          clientName: `Клиент ${i + 1}`,
          status,
          rate: 91.5,
          methodId: c2cMethod.id,
          bankDetailId: status !== Status.CREATED && bankDetail ? bankDetail.id : undefined,
          createdAt,
          acceptedAt: status !== Status.CREATED ? new Date(createdAt.getTime() + 300000) : undefined,
        }
      });

      console.log(`✅ Created transaction ${transaction.orderId} - ${incomingAmounts[i]}₽ (${status})`);
    }

    // Create payouts
    console.log('\n💰 Creating payouts...');
    const payoutAmounts = [
      45000, 55000, 65000, 75000, 85000, 95000, 105000, 115000, 125000, 135000,
      42000, 52000, 67000, 77000, 87000, 97000, 107000, 117000
    ];

    const payoutStatuses = ['CREATED', 'ACTIVE', 'CHECKING', 'COMPLETED', 'CANCELLED'];

    for (let i = 0; i < payoutAmounts.length; i++) {
      const status = payoutStatuses[i % payoutStatuses.length];
      const createdAt = new Date(now.getTime() - (i * 3600000));
      
      const payout = await db.payout.create({
        data: {
          merchantId: merchant.id,
          traderId: status !== 'CREATED' ? trader.id : undefined,
          amount: payoutAmounts[i],
          amountUsdt: payoutAmounts[i] / 91.5,
          total: payoutAmounts[i] * 1.02, // 2% fee
          totalUsdt: (payoutAmounts[i] * 1.02) / 91.5,
          rate: 91.5,
          wallet: `TRC${Math.random().toString(36).slice(2, 11).toUpperCase()}${Math.floor(Math.random() * 100000)}`,
          bank: ['SBERBANK', 'VTB', 'ALFABANK'][i % 3],
          isCard: true,
          status: status as any,
          createdAt,
          acceptedAt: status !== 'CREATED' ? new Date(createdAt.getTime() + 300000) : undefined,
          expireAt: new Date(createdAt.getTime() + 86400000),
          confirmedAt: status === 'COMPLETED' ? new Date(createdAt.getTime() + 900000) : undefined,
          cancelledAt: status === 'CANCELLED' ? new Date(createdAt.getTime() + 600000) : undefined,
          cancelReason: status === 'CANCELLED' ? 'Недостаточно средств' : undefined,
          merchantRate: 91.5,
        }
      });

      console.log(`✅ Created payout ${payout.numericId} - ${payoutAmounts[i]}₽ (${status})`);
    }

    // Update trader stats
    const totalTransactions = await db.transaction.count({
      where: { traderId: trader.id, status: Status.COMPLETED }
    });
    const totalPayouts = await db.payout.count({
      where: { traderId: trader.id, status: 'COMPLETED' }
    });

    console.log('\n📊 Summary:');
    console.log(`- Created ${incomingAmounts.length} transactions`);
    console.log(`- Created ${payoutAmounts.length} payouts`);
    console.log(`- Total completed transactions: ${totalTransactions}`);
    console.log(`- Total completed payouts: ${totalPayouts}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

createDirectTransactions();