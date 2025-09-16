#!/usr/bin/env bun
import { db } from "../src/db";

async function disableEmulatorServices() {
  console.log("🔧 Disabling emulator services...");

  const emulatorServices = [
    'MerchantEmulatorService',
    'PayoutEmulatorService',
    'DeviceEmulatorService',
    'TestMerchantMockService',
    'ExampleService',
    'AdvancedExampleService'
  ];

  for (const serviceName of emulatorServices) {
    try {
      const service = await db.service.findUnique({
        where: { name: serviceName }
      });

      if (service) {
        await db.service.update({
          where: { id: service.id },
          data: {
            enabled: false,
            status: 'STOPPED'
          }
        });
        console.log(`✅ Disabled ${serviceName}`);
      } else {
        // Create disabled service record
        await db.service.create({
          data: {
            name: serviceName,
            displayName: serviceName,
            description: 'Test/Emulator service (disabled)',
            enabled: false,
            status: 'STOPPED',
            interval: 5000,
            publicFields: {}
          }
        });
        console.log(`✅ Created and disabled ${serviceName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to disable ${serviceName}:`, error);
    }
  }

  console.log("✨ All emulator services have been disabled");
}

disableEmulatorServices().catch(console.error);