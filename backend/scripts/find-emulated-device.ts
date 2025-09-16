import { db } from "../src/db"

async function findEmulatedDevice() {
  try {
    // Find all emulated devices
    const devices = await db.device.findMany({
      where: { 
        emulated: true
      },
      include: {
        user: true,
        bankDetails: true
      }
    })
    
    console.log(`📱 Found ${devices.length} emulated device(s):\n`)
    
    devices.forEach(device => {
      console.log(`Device: ${device.name}`)
      console.log(`  ID: ${device.id}`)
      console.log(`  Token: ${device.token}`)
      console.log(`  User: ${device.user.email}`)
      console.log(`  Online: ${device.isOnline}`)
      console.log(`  Bank Details: ${device.bankDetails.length}`)
      if (device.bankDetails.length > 0) {
        device.bankDetails.forEach(bd => {
          console.log(`    - ${bd.bankType} ${bd.cardNumber}`)
        })
      }
      console.log("")
    })
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

findEmulatedDevice()