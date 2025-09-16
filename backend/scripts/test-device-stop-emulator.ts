import { db } from "@/db"

async function testDeviceStopAndEmulator() {
  try {
    console.log("🔍 Testing device stop functionality and emulator status...")

    // Get trader session
    const trader = await db.user.findUnique({
      where: { email: "trader@example.com" },
      include: {
        sessions: {
          where: {
            expiredAt: { gt: new Date() }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!trader || !trader.sessions[0]) {
      console.log("❌ No active session found")
      return
    }

    const session = trader.sessions[0]
    const baseUrl = "http://localhost:3000/api/trader"
    const headers = {
      "x-trader-token": session.token,
      "Content-Type": "application/json"
    }

    // 1. Get devices
    console.log("\n📱 Getting devices...")
    const devicesResponse = await fetch(`${baseUrl}/devices`, { headers })
    const devices = await devicesResponse.json()
    console.log(`Found ${devices.length} devices`)

    if (devices.length > 0) {
      const device = devices[0]
      console.log(`\nTesting with device: ${device.id} - ${device.name}`)
      console.log(`Current status: isOnline = ${device.isOnline}`)

      // 2. Test stop device
      console.log("\n🛑 Testing device stop...")
      console.log(`Calling: PATCH ${baseUrl}/devices/${device.id}/stop`)
      const stopResponse = await fetch(`${baseUrl}/devices/${device.id}/stop`, {
        method: 'PATCH',
        headers
      })
      
      if (stopResponse.ok) {
        const stopResult = await stopResponse.json()
        console.log("✅ Device stop response:", stopResult)
      } else {
        console.log("❌ Device stop failed:", stopResponse.status)
        const errorText = await stopResponse.text()
        console.log("Error response:", errorText.substring(0, 200))
      }

      // 3. Test start device
      console.log("\n▶️ Testing device start...")
      console.log(`Calling: PATCH ${baseUrl}/devices/${device.id}/start`)
      const startResponse = await fetch(`${baseUrl}/devices/${device.id}/start`, {
        method: 'PATCH',
        headers
      })
      
      if (startResponse.ok) {
        const startResult = await startResponse.json()
        console.log("✅ Device start response:", startResult)
      } else {
        console.log("❌ Device start failed:", startResponse.status)
        const errorText = await startResponse.text()
        console.log("Error response:", errorText.substring(0, 200))
      }
    }

    // 4. Check emulator status
    console.log("\n🤖 Checking emulator devices...")
    const emulatedDevices = await db.device.findMany({
      where: {
        emulated: true
      }
    })

    console.log(`Found ${emulatedDevices.length} emulated devices`)
    emulatedDevices.forEach(d => {
      console.log(`- ${d.id}: ${d.name}`)
      console.log(`  isOnline: ${d.isOnline}`)
      console.log(`  lastActiveAt: ${d.lastActiveAt}`)
      console.log(`  updatedAt: ${d.updatedAt}`)
    })

    // 5. Check device emulator service status
    console.log("\n⚙️ Checking device emulator service...")
    const serviceConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })

    if (serviceConfig) {
      console.log("Service enabled:", serviceConfig.isEnabled)
      const config = serviceConfig.config as any
      console.log("Configured devices:", config.devices?.length || 0)
      
      // Check if emulator is properly updating device status
      if (config.devices?.length > 0) {
        console.log("\n🔄 Emulator device configurations:")
        config.devices.forEach((d: any) => {
          console.log(`- Model: ${d.model}, Bank: ${d.bankType}`)
          console.log(`  Device code: ${d.deviceCode?.substring(0, 20)}...`)
          console.log(`  Ping interval: ${d.pingSec || config.global.defaultPingSec}s`)
        })
      }
    }

    // 6. Force update emulated devices to proper state
    console.log("\n🔧 Fixing emulated device states...")
    const fixedEmulated = await db.device.updateMany({
      where: {
        emulated: true,
        isOnline: null
      },
      data: {
        isOnline: false
      }
    })
    console.log(`Fixed ${fixedEmulated.count} emulated devices with null status`)

    console.log("\n✅ Testing complete!")

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

testDeviceStopAndEmulator()