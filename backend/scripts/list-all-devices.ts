import { db } from "../src/db"

async function listAllDevices() {
  try {
    const devices = await db.device.findMany({
      include: {
        user: true,
        bankDetails: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📱 Total devices: ${devices.length}\n`)
    
    devices.forEach(device => {
      console.log(`Device: ${device.name}`)
      console.log(`  ID: ${device.id}`)
      console.log(`  Token: ${device.token}`)
      console.log(`  User: ${device.user.email}`)
      console.log(`  Online: ${device.isOnline}`)
      console.log(`  Emulated: ${device.emulated}`)
      console.log(`  Bank Details: ${device.bankDetails.length}`)
      if (device.bankDetails.length > 0) {
        device.bankDetails.forEach(bd => {
          console.log(`    - ${bd.bankType} ${bd.cardNumber} (ID: ${bd.id})`)
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

listAllDevices()