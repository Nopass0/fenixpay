#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTraderState() {
  try {
    // Find the trader with email trader@test.com
    const trader = await prisma.user.findUnique({
      where: {
        email: 'trader@test.com'
      },
      select: {
        id: true,
        email: true,
        name: true,
        balanceRub: true,
        balanceUsdt: true,
        frozenRub: true,
        frozenUsdt: true,
        payoutBalance: true,
        frozenPayoutBalance: true,
        maxSimultaneousPayouts: true,
        trafficEnabled: true,
        banned: true,
        createdAt: true
      }
    });

    if (!trader) {
      console.log('❌ Trader with email trader@test.com not found');
      return;
    }

    console.log('\n📊 Trader Information:');
    console.log('========================');
    console.log(`ID: ${trader.id}`);
    console.log(`Email: ${trader.email}`);
    console.log(`Name: ${trader.name}`);
    console.log(`Banned: ${trader.banned}`);
    console.log(`Traffic Enabled: ${trader.trafficEnabled}`);
    console.log(`Created At: ${trader.createdAt}`);

    console.log('\n💰 Balance Information:');
    console.log('========================');
    console.log(`RUB Balance: ${trader.balanceRub}`);
    console.log(`USDT Balance: ${trader.balanceUsdt}`);
    console.log(`Frozen RUB: ${trader.frozenRub}`);
    console.log(`Frozen USDT: ${trader.frozenUsdt}`);
    console.log(`Payout Balance: ${trader.payoutBalance}`);
    console.log(`Frozen Payout Balance: ${trader.frozenPayoutBalance}`);
    console.log(`Available RUB: ${trader.balanceRub - trader.frozenRub}`);

    console.log('\n⚙️ Settings:');
    console.log('=============');
    console.log(`Max Simultaneous Payouts: ${trader.maxSimultaneousPayouts}`);

    // Check current payouts
    const payouts = await prisma.payout.findMany({
      where: {
        traderId: trader.id
      },
      select: {
        id: true,
        numericId: true,
        amount: true,
        amountUsdt: true,
        total: true,
        totalUsdt: true,
        status: true,
        createdAt: true,
        acceptedAt: true,
        expireAt: true,
        direction: true,
        merchant: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log('\n📋 Recent Payouts (Last 10):');
    console.log('==============================');
    if (payouts.length === 0) {
      console.log('No payouts found for this trader');
    } else {
      payouts.forEach((payout, index) => {
        console.log(`${index + 1}. Payout #${payout.numericId}`);
        console.log(`   ID: ${payout.id}`);
        console.log(`   Status: ${payout.status}`);
        console.log(`   Direction: ${payout.direction}`);
        console.log(`   Amount: ${payout.amount} RUB (${payout.amountUsdt} USDT)`);
        console.log(`   Total: ${payout.total} RUB (${payout.totalUsdt} USDT)`);
        console.log(`   Merchant: ${payout.merchant.name}`);
        console.log(`   Created: ${payout.createdAt}`);
        console.log(`   Accepted: ${payout.acceptedAt || 'Not accepted'}`);
        console.log(`   Expires: ${payout.expireAt}`);
        console.log('   ---');
      });
    }

    // Check active payouts
    const activePayouts = await prisma.payout.findMany({
      where: {
        traderId: trader.id,
        status: {
          in: ['ACTIVE', 'CHECKING']
        }
      },
      select: {
        id: true,
        numericId: true,
        status: true,
        amount: true,
        total: true,
        createdAt: true,
        expireAt: true
      }
    });

    console.log('\n🔄 Active Payouts:');
    console.log('===================');
    if (activePayouts.length === 0) {
      console.log('No active payouts');
    } else {
      console.log(`Found ${activePayouts.length} active payout(s):`);
      activePayouts.forEach((payout, index) => {
        console.log(`${index + 1}. Payout #${payout.numericId} - ${payout.status}`);
        console.log(`   Amount: ${payout.amount} RUB (Total: ${payout.total})`);
        console.log(`   Created: ${payout.createdAt}`);
        console.log(`   Expires: ${payout.expireAt}`);
      });
    }

    // Check available payouts (not taken by anyone)
    const availablePayouts = await prisma.payout.findMany({
      where: {
        traderId: null,
        status: 'CREATED'
      },
      select: {
        id: true,
        numericId: true,
        amount: true,
        amountUsdt: true,
        total: true,
        totalUsdt: true,
        createdAt: true,
        expireAt: true,
        merchant: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log('\n📩 Available Payouts (Last 5):');
    console.log('===============================');
    if (availablePayouts.length === 0) {
      console.log('No available payouts');
    } else {
      availablePayouts.forEach((payout, index) => {
        console.log(`${index + 1}. Payout #${payout.numericId}`);
        console.log(`   Amount: ${payout.amount} RUB (${payout.amountUsdt} USDT)`);
        console.log(`   Total: ${payout.total} RUB (${payout.totalUsdt} USDT)`);
        console.log(`   Merchant: ${payout.merchant.name}`);
        console.log(`   Created: ${payout.createdAt}`);
        console.log(`   Expires: ${payout.expireAt}`);
        console.log('   ---');
      });
    }

    // Summary analysis
    console.log('\n🔍 Analysis:');
    console.log('=============');
    console.log(`Can accept payouts: ${!trader.banned && trader.trafficEnabled ? 'YES' : 'NO'}`);
    console.log(`Active payouts count: ${activePayouts.length}/${trader.maxSimultaneousPayouts}`);
    console.log(`Can accept more: ${activePayouts.length < trader.maxSimultaneousPayouts ? 'YES' : 'NO'}`);
    console.log(`Available RUB balance: ${trader.balanceRub - trader.frozenRub}`);
    console.log(`Sufficient balance for smallest available payout: ${availablePayouts.length > 0 ? 
      (trader.balanceRub - trader.frozenRub >= Math.min(...availablePayouts.map(p => p.total)) ? 'YES' : 'NO') : 'N/A'}`);

  } catch (error) {
    console.error('Error checking trader state:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTraderState();