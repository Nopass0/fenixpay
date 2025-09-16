import { db } from "../src/db"
import { randomBytes } from "crypto"

async function createTestDevices() {
  try {
    // Find the first trader (any user)
    const trader = await db.user.findFirst({
      orderBy: { createdAt: 'asc' }
    })

    if (!trader) {
      console.error("No trader found in database")
      return
    }

    console.log(`Creating devices for trader: ${trader.email}`)

    // Create test devices
    const devices = [
      {
        name: "iPhone 15 Pro",
        browser: "Safari 17.2",
        os: "iOS 17.2",
        ip: "192.168.1.100",
        isOnline: true,
        energy: 85,
        ethernetSpeed: 100
      },
      {
        name: "Samsung Galaxy S24",
        browser: "Chrome 120.0",
        os: "Android 14",
        ip: "192.168.1.101",
        isOnline: true,
        energy: 92,
        ethernetSpeed: 150
      },
      {
        name: "MacBook Pro M3",
        browser: "Chrome 121.0",
        os: "macOS Sonoma",
        ip: "192.168.1.102",
        isOnline: false,
        energy: 100,
        ethernetSpeed: 1000
      },
      {
        name: "Windows Desktop",
        browser: "Edge 120.0",
        os: "Windows 11",
        ip: "192.168.1.103",
        isOnline: true,
        energy: 100,
        ethernetSpeed: 500
      }
    ]

    for (const deviceData of devices) {
      const token = randomBytes(32).toString('hex')
      
      const device = await db.device.create({
        data: {
          userId: trader.id,
          name: deviceData.name,
          token,
          isOnline: deviceData.isOnline,
          energy: deviceData.energy,
          ethernetSpeed: deviceData.ethernetSpeed,
          lastActiveAt: deviceData.isOnline ? new Date() : new Date(Date.now() - 3600000)
        }
      })

      console.log(`Created device: ${device.name} (${device.id})`)
    }

    console.log("\nDevices created successfully!")

    // List all devices
    const allDevices = await db.device.findMany({
      where: { userId: trader.id }
    })

    console.log(`\nTotal devices for trader: ${allDevices.length}`)
    allDevices.forEach(device => {
      console.log(`- ${device.name}: ${device.isOnline ? 'Online' : 'Offline'}`)
    })

  } catch (error) {
    console.error("Error creating devices:", error)
  } finally {
    await db.$disconnect()
  }
}

createTestDevices()