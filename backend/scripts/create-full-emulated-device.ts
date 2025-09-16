import { db } from "../src/db"
import { randomBytes } from "crypto"

async function createFullEmulatedDevice() {
  try {
    // Find the trader user
    const trader = await db.user.findUnique({
      where: { email: "trader@example.com" }
    })
    
    if (!trader) {
      console.log("❌ Trader user not found")
      return
    }
    
    // Generate a device token
    const token = randomBytes(32).toString('hex')
    
    // Create an emulated device
    const device = await db.device.create({
      data: {
        name: "Pixel 7 Pro (Emulated)",
        token,
        isOnline: true,
        emulated: true,
        userId: trader.id,
        energy: 85,
        ethernetSpeed: 100,
        lastActiveAt: new Date()
      }
    })
    
    console.log("✅ Created emulated device:")
    console.log("   ID:", device.id)
    console.log("   Token:", device.token)
    console.log("   Name:", device.name)
    
    // Create a bank detail linked to this device
    const bankDetail = await db.bankDetail.create({
      data: {
        userId: trader.id,
        deviceId: device.id,
        methodType: "c2c",
        bankType: "SBERBANK",
        cardNumber: "4444555566667777",
        recipientName: "Test Emulator",
        phoneNumber: "+79001234567",
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        intervalMinutes: 0,
        isArchived: false
      }
    })
    
    console.log("\n✅ Created bank detail:")
    console.log("   Bank:", bankDetail.bankType)
    console.log("   Card:", bankDetail.cardNumber)
    console.log("   ID:", bankDetail.id)
    
    // Update emulator config
    const config = {
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
        config,
        isEnabled: true
      }
    })
    
    console.log("\n✅ Updated emulator config")
    console.log("   Device token:", device.token)
    console.log("   Notifications: every 30 seconds with 80% chance")
    console.log("\n🎯 Device is ready for emulation!")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

createFullEmulatedDevice()