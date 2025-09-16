import { db } from "../src/db"

async function restartEmulator() {
  try {
    // Disable the service
    await db.serviceConfig.update({
      where: { serviceKey: "device_emulator" },
      data: { isEnabled: false }
    })
    
    console.log("⏸️  Disabled device emulator service")
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Enable the service
    await db.serviceConfig.update({
      where: { serviceKey: "device_emulator" },
      data: { isEnabled: true }
    })
    
    console.log("▶️  Enabled device emulator service")
    console.log("✅ Service restarted successfully")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

restartEmulator()