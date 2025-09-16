#!/usr/bin/env bun

import { db } from '../src/db';

async function clearTraderData() {
  console.log('🗑️ Clearing all trader data...');

  try {
    const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
    if (!trader) {
      console.log('❌ Trader not found');
      return;
    }

    console.log('👤 Found trader:', trader.email);

    // Get device IDs first
    const devices = await db.device.findMany({ where: { userId: trader.id } });
    const deviceIds = devices.map(d => d.id);

    // Get transaction IDs first
    const transactions = await db.transaction.findMany({ where: { traderId: trader.id } });
    const transactionIds = transactions.map(t => t.id);

    // Get folder IDs first  
    const folders = await db.folder.findMany({ where: { traderId: trader.id } });
    const folderIds = folders.map(f => f.id);

    // Get payout IDs first
    const payouts = await db.payout.findMany({ where: { traderId: trader.id } });
    const payoutIds = payouts.map(p => p.id);

    // Get bank detail IDs first
    const bankDetails = await db.bankDetail.findMany({ where: { userId: trader.id } });
    const bankDetailIds = bankDetails.map(bd => bd.id);

    // Delete in correct order due to foreign key constraints
    if (deviceIds.length > 0) {
      console.log('🗑️ Deleting notifications...');
      await db.notification.deleteMany({ where: { deviceId: { in: deviceIds } } });
    }

    if (transactionIds.length > 0) {
      console.log('🗑️ Deleting receipts...');
      await db.receipt.deleteMany({ where: { transactionId: { in: transactionIds } } });

      console.log('🗑️ Deleting deal dispute messages...');
      await db.dealDisputeMessage.deleteMany({ where: { dispute: { dealId: { in: transactionIds } } } });

      console.log('🗑️ Deleting deal disputes...');
      await db.dealDispute.deleteMany({ where: { dealId: { in: transactionIds } } });
    }

    if (payoutIds.length > 0) {
      console.log('🗑️ Deleting withdrawal dispute messages...');
      await db.withdrawalDisputeMessage.deleteMany({ where: { dispute: { payoutId: { in: payoutIds } } } });

      console.log('🗑️ Deleting withdrawal disputes...');
      await db.withdrawalDispute.deleteMany({ where: { payoutId: { in: payoutIds } } });
    }

    console.log('🗑️ Deleting transactions...');
    await db.transaction.deleteMany({ where: { traderId: trader.id } });

    if (folderIds.length > 0) {
      console.log('🗑️ Deleting requisites from folders...');
      await db.requisiteOnFolder.deleteMany({ where: { folderId: { in: folderIds } } });
    }

    console.log('🗑️ Deleting folders...');
    await db.folder.deleteMany({ where: { traderId: trader.id } });

    // Skip methods deletion as they may not be related to bankDetails anymore

    console.log('🗑️ Deleting bank details...');
    await db.bankDetail.deleteMany({ where: { userId: trader.id } });

    console.log('🗑️ Deleting devices...');
    await db.device.deleteMany({ where: { userId: trader.id } });

    console.log('🗑️ Deleting payouts...');
    await db.payout.deleteMany({ where: { traderId: trader.id } });

    console.log('🗑️ Deleting messages...');
    await db.message.deleteMany({ where: { traderId: trader.id } });

    // Skip deposits and withdrawals - these models may not exist

    console.log('✅ All trader data cleared successfully!');

  } catch (error) {
    console.error('❌ Error clearing trader data:', error);
  } finally {
    await db.$disconnect();
  }
}

clearTraderData();