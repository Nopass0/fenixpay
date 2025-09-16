import { db } from "../src/db"

async function enableDeviceEmulator() {
  try {
    // Update the service to be enabled
    await db.service.update({
      where: { name: "DeviceEmulatorService" },
      data: { 
        enabled: true,
        status: 'STOPPED' // Force it to restart
      }
    })
    
    console.log("✅ Enabled DeviceEmulatorService in services table")
    
    // Also ensure the config is enabled
    await db.serviceConfig.update({
      where: { serviceKey: "device_emulator" },
      data: { isEnabled: true }
    })
    
    console.log("✅ Enabled device_emulator in service config")
    console.log("\n🎯 Device emulator should start on next tick")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

enableDeviceEmulator()