import { db } from "../src/db"

async function fixDeviceFinal() {
  try {
    // Find the emulated device
    const device = await db.device.findFirst({
      where: { 
        emulated: true
      }
    })
    
    if (!device) {
      console.log("❌ No emulated device found")
      return
    }
    
    // Update device to be online with proper values
    await db.device.update({
      where: { id: device.id },
      data: {
        isOnline: true,
        lastActiveAt: new Date(),
        energy: 85,
        ethernetSpeed: 100
      }
    })
    
    console.log("✅ Device updated:")
    console.log("   Name:", device.name)
    console.log("   Status: 🟢 Online")
    console.log("   Battery: 85%")
    console.log("   Network: 100 Mbps")
    console.log("   Token:", device.token)
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

fixDeviceFinal()