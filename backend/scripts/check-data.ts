#!/usr/bin/env bun

import { db } from '../src/db';

async function checkData() {
  console.log('=== CHECKING DATABASE DATA ===');

  const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
  if (!trader) {
    console.log('❌ Trader not found');
    process.exit(1);
  }

  console.log('👤 Trader ID:', trader.id);
  console.log('📊 Trader numericId:', trader.numericId);

  const devices = await db.device.count({ where: { userId: trader.id } });
  console.log('📱 Devices count:', devices);

  const transactions = await db.transaction.count({ where: { traderId: trader.id } });
  console.log('💰 Transactions count:', transactions);

  const payouts = await db.payout.count({ where: { traderId: trader.id } });
  console.log('💸 Payouts count:', payouts);

  const messages = await db.message.count({ where: { traderId: trader.id } });
  console.log('💬 Messages count:', messages);

  const bankDetails = await db.bankDetail.count({ where: { userId: trader.id } });
  console.log('💳 Bank details count:', bankDetails);

  const folders = await db.folder.count({ where: { traderId: trader.id } });
  console.log('📁 Folders count:', folders);

  // Check sample data
  const sampleTransaction = await db.transaction.findFirst({ 
    where: { traderId: trader.id },
    include: { merchant: true, method: true }
  });
  console.log('💰 Sample transaction:', sampleTransaction ? `${sampleTransaction.orderId} - ${sampleTransaction.amount}` : 'None');

  const sampleDevice = await db.device.findFirst({ where: { userId: trader.id } });
  console.log('📱 Sample device:', sampleDevice ? sampleDevice.name : 'None');

  await db.$disconnect();
}

checkData();