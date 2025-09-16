import { db } from "../src/db"

async function checkEmulatorStatus() {
  try {
    console.log("🔍 Checking Device Emulator Service status...\n")
    
    // 1. Check service config
    const serviceConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    if (!serviceConfig) {
      console.log("❌ Device Emulator Service config not found!")
      return
    }
    
    const config = serviceConfig.config as any
    
    console.log("📋 Service Configuration:")
    console.log(`   Enabled: ${serviceConfig.isEnabled}`)
    console.log(`   Environment DES_ENABLED: ${process.env.DES_ENABLED || 'not set'}`)
    console.log(`   Last updated: ${serviceConfig.updatedAt}`)
    
    if (config.devices && config.devices.length > 0) {
      console.log(`\n🤖 Configured Devices: ${config.devices.length}`)
      config.devices.forEach((device, index) => {
        console.log(`\n   Device ${index + 1}:`)
        console.log(`     Code: ${device.deviceCode?.substring(0, 20)}...`)
        console.log(`     Bank: ${device.bankType}`)
        console.log(`     Model: ${device.model}`)
        console.log(`     Ping interval: ${device.pingSec} seconds`)
        console.log(`     Notification chance: ${(device.notifyChance * 100).toFixed(0)}%`)
        console.log(`     Spam chance: ${(device.spamChance * 100).toFixed(0)}%`)
      })
    } else {
      console.log("\n⚠️  No devices configured in emulator")
    }
    
    console.log("\n🌐 Global Settings:")
    console.log(`   Default ping: ${config.global?.defaultPingSec} seconds`)
    console.log(`   Default notification chance: ${(config.global?.defaultNotifyChance * 100).toFixed(0)}%`)
    console.log(`   Default spam chance: ${(config.global?.defaultSpamChance * 100).toFixed(0)}%`)
    
    // 2. Check if devices exist in DB
    console.log("\n📱 Checking actual devices in database...")
    const devices = await db.device.findMany({
      include: {
        user: true,
        bankDetails: true
      }
    })
    
    console.log(`Found ${devices.length} devices total`)
    
    if (config.devices && config.devices.length > 0) {
      for (const configDevice of config.devices) {
        const realDevice = devices.find(d => d.token === configDevice.deviceCode)
        if (realDevice) {
          console.log(`\n   ✅ Device found: ${realDevice.name}`)
          console.log(`      User: ${realDevice.user.email}`)
          console.log(`      Online: ${realDevice.isOnline}`)
          console.log(`      Bank details: ${realDevice.bankDetails.length}`)
          console.log(`      Last active: ${realDevice.lastActiveAt || 'never'}`)
        } else {
          console.log(`\n   ❌ Device NOT found with token: ${configDevice.deviceCode?.substring(0, 20)}...`)
        }
      }
    }
    
    // 3. Check recent notifications
    console.log("\n📬 Recent notifications (last 5):")
    const notifications = await db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { Device: true }
    })
    
    if (notifications.length > 0) {
      notifications.forEach((notif, index) => {
        const age = Math.round((Date.now() - notif.createdAt.getTime()) / 1000)
        console.log(`   ${index + 1}. ${notif.message?.substring(0, 50)}... (${age}s ago, device: ${notif.Device?.name || 'unknown'})`)
      })
    } else {
      console.log("   No notifications found")
    }
    
    // 4. Check active transactions for matching
    console.log("\n💰 Active transactions available for matching:")
    const activeTransactions = await db.transaction.count({
      where: {
        status: { in: ["CREATED", "IN_PROGRESS"] }
      }
    })
    console.log(`   Found ${activeTransactions} active transactions`)
    
    // 5. Diagnosis
    console.log("\n🔧 Diagnosis:")
    
    const issues = []
    
    if (!serviceConfig.isEnabled) {
      issues.push("Service is DISABLED in database")
    }
    
    if (process.env.DES_ENABLED !== 'true') {
      issues.push("DES_ENABLED environment variable is not 'true'")
    }
    
    if (!config.devices || config.devices.length === 0) {
      issues.push("No devices configured in emulator")
    }
    
    if (config.devices && config.devices.length > 0) {
      const realDeviceCount = config.devices.filter(cd => 
        devices.some(d => d.token === cd.deviceCode)
      ).length
      
      if (realDeviceCount === 0) {
        issues.push("Configured devices don't exist in database")
      }
    }
    
    if (notifications.length === 0) {
      issues.push("No notifications have been generated")
    }
    
    if (activeTransactions === 0) {
      issues.push("No active transactions to match with")
    }
    
    if (issues.length > 0) {
      console.log("   ❌ Issues found:")
      issues.forEach(issue => console.log(`      - ${issue}`))
    } else {
      console.log("   ✅ Everything looks configured correctly")
      console.log("   If notifications aren't being sent, check:")
      console.log("      - Is the Device Emulator Service actually running?")
      console.log("      - Are the devices successfully connected?")
      console.log("      - Check service logs for connection errors")
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

checkEmulatorStatus()