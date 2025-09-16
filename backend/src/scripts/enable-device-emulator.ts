import { db } from "../db";

async function enableDeviceEmulator() {
  try {
    const existing = await db.serviceConfig.findUnique({
      where: { serviceKey: 'device_emulator' }
    });

    if (existing) {
      const updated = await db.serviceConfig.update({
        where: { serviceKey: 'device_emulator' },
        data: { isEnabled: true }
      });
      console.log("✅ Device Emulator Service enabled:", updated);
    } else {
      const created = await db.serviceConfig.create({
        data: {
          serviceKey: 'device_emulator',
          isEnabled: true,
          config: {
            global: {
              defaultPingSec: 60,
              defaultNotifyChance: 0.4,
              defaultSpamChance: 0.05,
              defaultDelayChance: 0.1,
              reconnectOnAuthError: true,
            },
            devices: []
          }
        }
      });
      console.log("✅ Device Emulator Service created and enabled:", created);
    }

  } catch (error) {
    console.error("Error enabling device emulator:", error);
  } finally {
    await db.$disconnect();
  }
}

enableDeviceEmulator();