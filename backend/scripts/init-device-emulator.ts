import { db } from "../src/db"

async function initDeviceEmulator() {
  console.log("Initializing Device Emulator Service configuration...")
  
  const config = {
    global: {
      defaultPingSec: 60,
      defaultNotifyChance: 0.4,
      defaultSpamChance: 0.05,
      defaultDelayChance: 0.1,
      reconnectOnAuthError: true,
      rngSeed: 12345, // For deterministic testing
    },
    devices: [
      {
        deviceCode: "test-sber-1",
        bankType: "SBER",
        model: "Pixel 7 Pro",
        androidVersion: "13",
        initialBattery: 85,
        pingSec: 30,
        notifyChance: 0.5,
        spamChance: 0.1,
        delayChance: 0.05,
      },
      {
        deviceCode: "test-tink-1",
        bankType: "TINK",
        model: "iPhone 14",
        androidVersion: "iOS 16",
        initialBattery: 70,
        pingSec: 45,
        notifyChance: 0.3,
      },
    ],
  }
  
  try {
    await db.serviceConfig.upsert({
      where: { serviceKey: "device_emulator" },
      create: {
        serviceKey: "device_emulator",
        config,
        isEnabled: true,
      },
      update: {
        config,
        isEnabled: true,
      },
    })
    
    console.log("✅ Device Emulator Service configuration initialized")
  } catch (error) {
    console.error("❌ Failed to initialize configuration:", error)
  } finally {
    await db.$disconnect()
  }
}

initDeviceEmulator()