import { db } from "../src/db"

async function updateEmulatorConfig() {
  try {
    // Find the bank detail for the emulated device
    const device = await db.device.findFirst({
      where: { 
        token: "2e5cf2e90bd27ec6a50021308abf85b92ac463f889f3eaee5a20b1f8b2906252"
      },
      include: {
        bankDetails: true
      }
    })
    
    if (!device || device.bankDetails.length === 0) {
      console.log("❌ Device or bank details not found")
      return
    }
    
    const bankDetailId = device.bankDetails[0].id
    console.log("📋 Bank Detail ID:", bankDetailId)
    console.log("📱 Device Token:", device.token)
    
    // Update the emulator config to use the device token
    const newConfig = {
      global: {
        defaultPingSec: 60,
        defaultNotifyChance: 0.4,
        defaultSpamChance: 0.05,
        defaultDelayChance: 0.1,
        reconnectOnAuthError: true,
        rngSeed: 12345
      },
      devices: [
        {
          deviceCode: device.token, // Use device token, not bank detail ID
          bankType: "SBER",
          model: "Pixel 7 Pro",
          androidVersion: "13",
          initialBattery: 85,
          pingSec: 30, // Faster ping for testing
          notifyChance: 0.8, // Higher chance for testing
          spamChance: 0.1,
          delayChance: 0.1
        }
      ]
    }
    
    await db.serviceConfig.update({
      where: { serviceKey: "device_emulator" },
      data: { 
        config: newConfig,
        isEnabled: true
      }
    })
    
    console.log("✅ Emulator config updated with device token")
    console.log("   Device will connect using token:", device.token)
    console.log("   Notifications will be sent every 30 seconds with 80% chance")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

updateEmulatorConfig()