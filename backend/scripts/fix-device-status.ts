import { db } from "../src/db"

async function fixDeviceStatus() {
  try {
    // Find the emulated device
    const device = await db.device.findFirst({
      where: { 
        token: "2e5cf2e90bd27ec6a50021308abf85b92ac463f889f3eaee5a20b1f8b2906252"
      }
    })
    
    if (device) {
      // Update device to be online
      await db.device.update({
        where: { id: device.id },
        data: { 
          isOnline: true,
          lastActiveAt: new Date()
        }
      })
      
      console.log("✅ Device updated to online status")
      
      // Check if it has active bank details
      const bankDetail = await db.bankDetail.findFirst({
        where: { 
          deviceId: device.id,
          isArchived: false
        }
      })
      
      if (bankDetail) {
        console.log("✅ Device has active bank detail:", bankDetail.bankType, bankDetail.cardNumber)
      }
    } else {
      console.log("❌ Device not found")
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

fixDeviceStatus()