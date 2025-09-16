#!/usr/bin/env bun

import { db } from '../src/db';

async function addTransactions() {
  console.log('🚀 Adding transactions and payouts...');

  try {
    // Get required data
    const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
    const merchant = await db.merchant.findFirst();
    const payinMethod = await db.method.findFirst({ where: { code: 'C2C_RUB_IN' } });
    const payoutMethod = await db.method.findFirst({ where: { code: 'SBP_RUB_OUT' } });
    const bankDetails = await db.bankDetail.findMany({ where: { userId: trader?.id } });
    const merchantUser = await db.user.findFirst({ where: { email: 'merchant@test.com' } });

    if (!trader || !merchant || !payinMethod || !payoutMethod || !merchantUser) {
      console.log('❌ Required data not found');
      return;
    }

    // Create transactions
    console.log('\n💸 Creating transactions...');
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
            callbackUri: 'https://test.com/callback',
            successUri: 'https://test.com/success',
            failUri: 'https://test.com/fail',
            type: 'IN',
            expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            commission: payinMethod.commissionPayin,
            clientName: `Клиент ${i + 1}`,
            status,
            rate: 90 + Math.random() * 5,
            kkkPercent: 15,
            acceptedAt: status !== 'CREATED' ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000) : null,
            bankDetailId: status !== 'CREATED' ? bankDetails[i % bankDetails.length]?.id : null,
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

    // Create payouts
    console.log('\n💰 Creating payouts...');
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

    // Final balance check
    const finalTrader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
    console.log('\n📊 Final trader state:', {
      balanceRub: finalTrader?.balanceRub,
      balanceUsdt: finalTrader?.balanceUsdt,
      profitFromDeals: finalTrader?.profitFromDeals,
      deposit: finalTrader?.deposit
    });

    console.log('\n🎉 Transactions and payouts added successfully!');

  } catch (error) {
    console.error('❌ Error adding transactions:', error);
  } finally {
    await db.$disconnect();
  }
}

addTransactions();