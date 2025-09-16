import { db } from "@/db"
import { Status } from "@prisma/client"

async function fixTraderApiIssues() {
  try {
    console.log("🔧 Starting to fix trader API issues...")

    // 1. Check bank details with devices to understand the 422 error
    console.log("\n📊 Checking bank details with devices...")
    const bankDetailsWithDevices = await db.bankDetail.findMany({
      where: {
        deviceId: {
          not: null
        }
      },
      include: {
        device: true,
        user: true
      },
      take: 5
    })

    console.log(`Found ${bankDetailsWithDevices.length} bank details with devices`)
    bankDetailsWithDevices.forEach(bd => {
      console.log(`- Bank Detail ${bd.id}: has device: ${!!bd.device}`)
      if (bd.device) {
        console.log(`  - Device ${bd.device.id}: ${bd.device.name}, online: ${bd.device.isOnline}, token: ${bd.device.token?.substring(0, 10)}...`)
      }
    })

    // 2. Check devices without proper bank detail connections
    console.log("\n🔍 Checking devices...")
    const devices = await db.device.findMany({
      include: {
        bankDetails: true
      },
      take: 10
    })

    console.log(`Found ${devices.length} devices`)
    devices.forEach(d => {
      console.log(`- Device ${d.id}: ${d.name}, online: ${d.isOnline}, bankDetails: ${d.bankDetails.length}`)
    })

    // 3. Check emulated devices
    console.log("\n🤖 Checking emulated devices...")
    const emulatedDevices = await db.device.findMany({
      where: {
        OR: [
          { name: { contains: "Emulated" } },
          { name: { contains: "Virtual" } },
          { token: { startsWith: "emulator_" } }
        ]
      }
    })

    console.log(`Found ${emulatedDevices.length} emulated devices`)
    emulatedDevices.forEach(d => {
      console.log(`- ${d.id}: ${d.name}, online: ${d.isOnline}, updated: ${d.updatedAt}`)
    })

    // 4. Fix emulated devices that are stuck
    console.log("\n🔧 Fixing stuck emulated devices...")
    const stuckDevices = await db.device.updateMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: "Emulated" } },
              { name: { contains: "Virtual" } },
              { token: { startsWith: "emulator_" } }
            ]
          },
          { isOnline: null }
        ]
      },
      data: {
        isOnline: false
      }
    })
    console.log(`Fixed ${stuckDevices.count} stuck emulated devices`)

    // 5. Check service config for device emulator
    console.log("\n⚙️ Checking device emulator service config...")
    const serviceConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    if (serviceConfig) {
      console.log("Device emulator config:", JSON.stringify(serviceConfig.config, null, 2))
      console.log("Enabled:", serviceConfig.isEnabled)
    } else {
      console.log("No device emulator config found")
    }

    // 6. Check for requisites with missing status field
    console.log("\n📋 Checking requisites structure...")
    const sampleRequisite = await db.bankDetail.findFirst({
      include: {
        device: true
      }
    })
    
    if (sampleRequisite) {
      console.log("Sample requisite structure:")
      console.log("- id:", sampleRequisite.id)
      console.log("- isArchived:", sampleRequisite.isArchived)
      console.log("- device count:", sampleRequisite.device ? 1 : 0)
      console.log("- has deviceId field:", 'deviceId' in sampleRequisite)
      console.log("- deviceId value:", sampleRequisite.deviceId)
    }

    console.log("\n✅ Analysis complete!")

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

fixTraderApiIssues()