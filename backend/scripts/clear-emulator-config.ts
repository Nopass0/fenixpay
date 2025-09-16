import { db } from "../src/db"

async function clearEmulatorConfig() {
  try {
    console.log("🤖 Clearing Device Emulator Service config...")
    
    const emptyConfig = {
      global: {
        defaultPingSec: 60,
        defaultNotifyChance: 0.4,
        defaultSpamChance: 0.05,
        defaultDelayChance: 0.1,
        reconnectOnAuthError: true,
      },
      devices: []
    }
    
    await db.serviceConfig.update({
      where: { serviceKey: "device_emulator" },
      data: { 
        config: emptyConfig,
        isEnabled: false
      }
    })
    
    console.log("✅ Device Emulator Service config cleared and disabled")
    console.log("   - All emulated devices removed from config")
    console.log("   - Service disabled")
    console.log("   - Ready for clean start")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

clearEmulatorConfig()