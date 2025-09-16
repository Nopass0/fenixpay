#!/usr/bin/env bun
import { db } from '../src/db';

// List of services that need to be created
const services = [
  { name: 'PayoutExpiryService', displayName: 'Payout Expiry Service', description: 'Monitors and handles expired payouts', enabled: true },
  { name: 'ExpiredTransactionWatcher', displayName: 'Expired Transaction Watcher', description: 'Watches for expired transactions', enabled: true },
  { name: 'DeviceHealthCheckService', displayName: 'Device Health Check Service', description: 'Monitors device health status', enabled: true },
  { name: 'NotificationMatcherService', displayName: 'Notification Matcher Service', description: 'Matches notifications to transactions', enabled: true },
  { name: 'NotificationAutoProcessorService', displayName: 'Notification Auto Processor Service', description: 'Automatically processes notifications', enabled: true },
  { name: 'TestMerchantMockService', displayName: 'Test Merchant Mock Service', description: 'Mock service for testing merchant functionality', enabled: false },
  { name: 'ExampleService', displayName: 'Example Service', description: 'Example background service', enabled: false },
  { name: 'AdvancedExampleService', displayName: 'Advanced Example Service', description: 'Advanced example background service', enabled: false },
  { name: 'TelegramService', displayName: 'Telegram Service', description: 'Telegram bot integration', enabled: false },
  { name: 'MerchantEmulatorService', displayName: 'Merchant Emulator Service', description: 'Emulates merchant transactions for testing', enabled: false },
  { name: 'PayoutMonitorService', displayName: 'Payout Monitor Service', description: 'Monitors payout processing', enabled: true },
  { name: 'PayoutWatcherService', displayName: 'Payout Watcher Service', description: 'Watches payout status changes', enabled: false },
  { name: 'DeviceEmulatorService', displayName: 'Device Emulator Service', description: 'Emulates device behavior for testing', enabled: false },
  { name: 'PayoutEmulatorService', displayName: 'Payout Emulator Service', description: 'Emulates payout processing for testing', enabled: false },
  { name: 'PayoutRedistributionService', displayName: 'Payout Redistribution Service', description: 'Redistributes unassigned payouts to available traders', enabled: true },
  { name: 'CallbackService', displayName: 'Callback Service', description: 'Sends webhook callbacks to merchants for completed transactions', enabled: true },
];

async function initializeServices() {
  console.log('🔧 Initializing service records...');

  for (const service of services) {
    try {
      const existingService = await db.service.findUnique({
        where: { name: service.name },
      });

      if (existingService) {
        console.log(`✓ Service ${service.name} already exists`);
      } else {
        await db.service.create({
          data: {
            name: service.name,
            displayName: service.displayName,
            description: service.description,
            interval: 5000, // Default interval
            status: 'STOPPED',
            enabled: service.enabled,
            publicFields: {},
          },
        });
        console.log(`✓ Created service: ${service.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create service ${service.name}:`, error);
    }
  }

  console.log('✅ Service initialization completed!');
  process.exit(0);
}

initializeServices().catch(console.error);