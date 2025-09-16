#!/usr/bin/env bun

import { db } from '../src/db';

async function test() {
  try {
    console.log('Testing notification creation...');
    
    const device = await db.device.findFirst();
    if (!device) {
      console.log('No device found');
      return;
    }
    
    console.log('Device:', device.id);
    
    const notification = await db.notification.create({
      data: {
        type: 'SMS',
        deviceId: device.id,
        message: 'Test message',
        title: 'Test',
        application: 'com.test.app',
        isRead: false
      }
    });
    
    console.log('Created:', notification);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

test();