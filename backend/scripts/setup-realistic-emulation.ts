import { db } from "../src/db"

async function setupRealisticEmulation() {
  try {
    console.log("🔧 Setting up realistic emulation...")
    
    // Find the emulated device
    const device = await db.device.findFirst({
      where: { emulated: true }
    })
    
    if (!device) {
      console.log("❌ No emulated device found")
      return
    }
    
    // Update emulator config for more frequent notifications
    const config = {
      global: {
        defaultPingSec: 30,
        defaultNotifyChance: 0.7, // 70% chance to send notification
        defaultSpamChance: 0.05,
        defaultDelayChance: 0.1,
        reconnectOnAuthError: true,
        rngSeed: Date.now() // Use current time for better randomness
      },
      devices: [
        {
          deviceCode: device.token,
          bankType: "SBER",
          model: "Pixel 7 Pro",
          androidVersion: "13",
          initialBattery: 85,
          pingSec: 20, // Check every 20 seconds
          notifyChance: 0.8, // 80% chance for this device
          spamChance: 0.05,
          delayChance: 0.05
        }
      ]
    }
    
    await db.serviceConfig.update({
      where: { serviceKey: "device_emulator" },
      data: { 
        config,
        isEnabled: true
      }
    })
    
    console.log("✅ Updated emulator config:")
    console.log("   - Ping every 20 seconds")
    console.log("   - 80% notification chance")
    console.log("   - Device token:", device.token)
    
    // Ensure notification processing services are enabled
    await db.service.updateMany({
      where: {
        name: {
          in: ["NotificationAutoProcessorService", "NotificationMatcherService"]
        }
      },
      data: {
        enabled: true
      }
    })
    
    console.log("✅ Enabled notification processing services")
    
    // Create some test transactions to match
    console.log("\n📝 Creating test transactions...")
    
    const amounts = [5000, 12500, 8900, 15000, 3250, 7777, 21000]
    
    for (const amount of amounts) {
      // Find a merchant method
      const method = await db.merchantMethod.findFirst({
        where: {
          isEnabled: true
        }
      })
      
      if (!method) continue
      
      // Create a transaction
      // Skip if no method found
      if (!method) {
        console.log("   ⚠️  No merchant method found, skipping transaction creation")
        break
      }
      
      const tx = await db.transaction.create({
        data: {
          merchantId: method.merchantId,
          methodId: method.id,
          orderId: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          amount,
          status: "CREATED",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          metadata: {
            test: true,
            purpose: "emulation_testing"
          }
        }
      })
      
      console.log(`   ✅ Created transaction ${tx.id} for ${amount} ₽`)
    }
    
    console.log("\n🎯 Setup complete! Run 'bun run scripts/start-continuous-emulation.ts' to start emulation")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

setupRealisticEmulation()