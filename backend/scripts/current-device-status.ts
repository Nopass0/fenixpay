import { db } from "../src/db"

async function getCurrentDeviceStatus() {
  try {
    console.log("📊 Current device status for trader@example.com\n")
    
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        devices: {
          include: {
            bankDetails: true,
            notifications: {
              take: 3,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        bankDetails: true,
        sessions: {
          where: {
            expiredAt: { gt: new Date() }
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    console.log("✅ Trader found:", trader.email)
    console.log(`   Balance RUB: ${trader.balanceRub}`)
    console.log(`   Balance USDT: ${trader.balanceUsdt}`)
    console.log(`   Traffic Enabled: ${trader.trafficEnabled}`)
    console.log(`   Banned: ${trader.banned}`)
    
    console.log(`\n📱 Devices (${trader.devices.length}):`)
    if (trader.devices.length === 0) {
      console.log("   No devices found")
    } else {
      trader.devices.forEach((device, index) => {
        console.log(`\n   ${index + 1}. ${device.name}`)
        console.log(`      ID: ${device.id}`)
        console.log(`      Token: ${device.token.substring(0, 16)}...`)
        console.log(`      Online: ${device.isOnline}`)
        console.log(`      Emulated: ${device.emulated}`)
        console.log(`      Energy: ${device.energy}`)
        console.log(`      Created: ${device.createdAt}`)
        console.log(`      Updated: ${device.updatedAt}`)
        console.log(`      Last Active: ${device.lastActiveAt}`)
        console.log(`      Bank Details: ${device.bankDetails.length}`)
        console.log(`      Recent Notifications: ${device.notifications.length}`)
      })
    }
    
    console.log(`\n🏦 Bank Details (${trader.bankDetails.length}):`)
    if (trader.bankDetails.length === 0) {
      console.log("   No bank details found")
    } else {
      trader.bankDetails.forEach((bd, index) => {
        console.log(`\n   ${index + 1}. ${bd.bankType} - ${bd.cardNumber}`)
        console.log(`      ID: ${bd.id}`)
        console.log(`      Device ID: ${bd.deviceId || 'Not linked'}`)
        console.log(`      Archived: ${bd.isArchived}`)
        console.log(`      Method: ${bd.methodType}`)
        console.log(`      Name: ${bd.recipientName}`)
      })
    }
    
    console.log(`\n🔑 Active Sessions (${trader.sessions.length}):`)
    trader.sessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.token.substring(0, 20)}...`)
      console.log(`      Created: ${session.createdAt}`)
      console.log(`      Expires: ${session.expiredAt}`)
      console.log(`      IP: ${session.ip}`)
    })
    
    // Проверяем DES конфигурацию
    const emulatorConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    console.log(`\n🤖 Device Emulator Service:`)
    console.log(`   Enabled: ${emulatorConfig?.isEnabled || false}`)
    if (emulatorConfig?.config) {
      const config = emulatorConfig.config as any
      console.log(`   Devices in config: ${config.devices?.length || 0}`)
      if (config.devices?.length > 0) {
        config.devices.forEach((device: any, index: number) => {
          console.log(`      ${index + 1}. ${device.deviceCode?.substring(0, 16)}... (${device.bankType})`)
        })
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

getCurrentDeviceStatus()