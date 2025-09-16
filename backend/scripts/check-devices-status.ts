import { db } from "../src/db"

async function checkDevicesStatus() {
  try {
    console.log("🔍 Checking devices status in database...\n")
    
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        devices: {
          include: {
            bankDetails: true,
            notifications: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    console.log("✅ Found trader:", trader.email)
    console.log(`📱 Total devices: ${trader.devices.length}`)
    
    if (trader.devices.length === 0) {
      console.log("   No devices found for trader")
      return
    }
    
    trader.devices.forEach((device, index) => {
      console.log(`\n📱 Device ${index + 1}:`)
      console.log(`   ID: ${device.id}`)
      console.log(`   Name: ${device.name}`)
      console.log(`   Token: ${device.token}`)
      console.log(`   Online: ${device.isOnline}`)
      console.log(`   Emulated: ${device.emulated}`)
      console.log(`   Energy: ${device.energy}`)
      console.log(`   Created: ${device.createdAt}`)
      console.log(`   Updated: ${device.updatedAt}`)
      console.log(`   Last Active: ${device.lastActiveAt}`)
      console.log(`   Bank Details: ${device.bankDetails.length}`)
      console.log(`   Notifications: ${device.notifications.length}`)
      
      if (device.bankDetails.length > 0) {
        device.bankDetails.forEach((bd, bdIndex) => {
          console.log(`   Bank Detail ${bdIndex + 1}: ${bd.bankType} - ${bd.cardNumber}`)
        })
      }
    })
    
    // Проверим также emulator config
    console.log("\n🤖 Checking Device Emulator Service config...")
    const emulatorConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    if (emulatorConfig?.config) {
      const config = emulatorConfig.config as any
      console.log(`   Enabled: ${emulatorConfig.isEnabled}`)
      console.log(`   Devices in config: ${config.devices?.length || 0}`)
      
      if (config.devices?.length > 0) {
        config.devices.forEach((device: any, index: number) => {
          console.log(`   Config Device ${index + 1}: ${device.deviceCode} (${device.bankType})`)
        })
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

checkDevicesStatus()