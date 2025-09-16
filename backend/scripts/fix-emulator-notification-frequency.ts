import { db } from "../src/db"

async function fixEmulatorNotificationFrequency() {
  try {
    console.log("🔧 Fixing Device Emulator Service notification frequency...\n")
    
    // Get current config
    const serviceConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    if (!serviceConfig) {
      console.log("❌ Device Emulator Service config not found!")
      return
    }
    
    const currentConfig = serviceConfig.config as any
    console.log("📋 Current Configuration:")
    console.log(`   Ping interval: ${currentConfig.devices[0]?.pingSec} seconds`)
    console.log(`   Notification chance: ${(currentConfig.devices[0]?.notifyChance * 100).toFixed(0)}%`)
    
    // Update configuration with better settings
    const updatedConfig = {
      global: {
        defaultPingSec: 30,
        defaultNotifyChance: 0.8, // 80% chance
        defaultSpamChance: 0.1,
        defaultDelayChance: 0.05, // Less delay
        reconnectOnAuthError: true,
        rngSeed: Date.now()
      },
      devices: currentConfig.devices.map(device => ({
        ...device,
        pingSec: 15, // Update device info every 15 seconds
        notifyChance: 0.85, // 85% chance of notification
        spamChance: 0.05, // 5% spam
        // Add a separate notification interval (not in schema, but as a workaround)
        notifyIntervalSec: 10 // Send notifications every 10 seconds
      }))
    }
    
    // Update the config
    await db.serviceConfig.update({
      where: { serviceKey: "device_emulator" },
      data: {
        config: updatedConfig,
        isEnabled: true
      }
    })
    
    console.log("\n✅ Updated Configuration:")
    console.log(`   Ping interval: ${updatedConfig.devices[0]?.pingSec} seconds`)
    console.log(`   Notification chance: ${(updatedConfig.devices[0]?.notifyChance * 100).toFixed(0)}%`)
    console.log(`   Expected notifications: ~${Math.round(60 / updatedConfig.devices[0]?.pingSec * updatedConfig.devices[0]?.notifyChance)} per minute`)
    
    console.log("\n📬 To test notifications immediately, you can:")
    console.log("   1. Restart the Device Emulator Service")
    console.log("   2. Or run the manual notification test script")
    
    // Also make sure DES_ENABLED is set
    if (process.env.DES_ENABLED !== 'true') {
      console.log("\n⚠️  Remember to set DES_ENABLED=true in your environment!")
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

fixEmulatorNotificationFrequency()