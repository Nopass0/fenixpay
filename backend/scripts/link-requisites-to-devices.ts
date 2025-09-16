#!/usr/bin/env bun

import { db } from '../src/db';

async function linkRequisitesToDevices() {
  console.log('🔗 Linking requisites to devices...');

  try {
    // Get trader
    const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
    if (!trader) {
      console.log('❌ Trader not found');
      return;
    }

    // Get all devices
    const devices = await db.device.findMany({
      where: { userId: trader.id },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📱 Found ${devices.length} devices`);

    // Get all bank details
    const bankDetails = await db.bankDetail.findMany({
      where: { userId: trader.id },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`💳 Found ${bankDetails.length} bank details`);

    // Link each bank detail to a device
    for (let i = 0; i < bankDetails.length; i++) {
      const bankDetail = bankDetails[i];
      const device = devices[i % devices.length]; // Cycle through devices if more bank details than devices

      // Update bank detail with device
      await db.bankDetail.update({
        where: { id: bankDetail.id },
        data: {
          deviceId: device.id,
          isArchived: false // Ensure it's not archived
        }
      });

      console.log(`✅ Linked ${bankDetail.bankType} *${bankDetail.cardNumber.slice(-4)} to device ${device.name}`);
    }

    // Make sure all devices are online
    await db.device.updateMany({
      where: { userId: trader.id },
      data: { isOnline: true }
    });

    console.log('✅ All devices set to online');

    console.log('\n🎉 Successfully linked all requisites to devices!');

  } catch (error) {
    console.error('❌ Error linking requisites:', error);
  } finally {
    await db.$disconnect();
  }
}

linkRequisitesToDevices();