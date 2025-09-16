import { db } from "../src/db"

async function setupEmulatedDevice() {
  try {
    // Find the emulated device
    const device = await db.device.findFirst({
      where: { 
        token: "2e5cf2e90bd27ec6a50021308abf85b92ac463f889f3eaee5a20b1f8b2906252"
      }
    })
    
    if (!device) {
      console.log("❌ Device not found")
      return
    }
    
    console.log("✅ Found device:", device.name)
    
    // Create a bank detail for this device
    const bankDetail = await db.bankDetail.create({
      data: {
        userId: device.userId,
        deviceId: device.id,
        methodType: "c2c",
        bankType: "SBERBANK",
        cardNumber: "1111111111111111",
        recipientName: "Test User",
        phoneNumber: "+71234567890",
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        intervalMinutes: 0,
        isArchived: false
      }
    })
    
    console.log("✅ Created bank detail:", bankDetail.bankType, bankDetail.cardNumber)
    
    // Update emulator config
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
          deviceCode: device.token,
          bankType: "SBER",
          model: "Pixel 7 Pro",
          androidVersion: "13",
          initialBattery: 85,
          pingSec: 30,
          notifyChance: 0.8,
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
    
    console.log("✅ Emulator config updated")
    console.log("   Device will connect using token:", device.token)
    console.log("   Notifications will be sent every 30 seconds with 80% chance")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

setupEmulatedDevice()