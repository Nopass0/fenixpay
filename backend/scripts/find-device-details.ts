import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findDeviceDetails() {
  try {
    // Find the device for Example Trader
    const device = await prisma.device.findFirst({
      where: {
        userId: 'cmcrwr9rl0000ikklh2y555nq' // Example Trader ID
      },
      include: {
        user: true
      }
    })

    if (device) {
      console.log('Device Details:')
      console.log(`  ID: ${device.id}`)
      console.log(`  Name: ${device.name}`)
      console.log(`  Token: ${device.token || 'No token set'}`)
      console.log(`  Emulated: ${device.emulated}`)
      console.log(`  Online: ${device.isOnline}`)
      console.log(`  Last Active: ${device.lastActiveAt || 'Never'}`)
      console.log(`  User: ${device.user.name} (${device.user.email})`)
    } else {
      console.log('No device found')
    }

    // Also check if there are any devices with name containing "Pixel"
    const pixelDevices = await prisma.device.findMany({
      where: {
        name: {
          contains: 'Pixel'
        }
      }
    })

    if (pixelDevices.length > 0) {
      console.log('\nDevices with "Pixel" in name:')
      pixelDevices.forEach(d => {
        console.log(`  - ${d.name} (token: ${d.token || 'none'}, emulated: ${d.emulated})`)
      })
    }

  } catch (error) {
    console.error('Error querying database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findDeviceDetails()