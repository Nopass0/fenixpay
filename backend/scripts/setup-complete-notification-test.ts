import { db } from "../src/db"
import { httpClient } from "../src/utils/httpClient"

async function setupCompleteNotificationTest() {
  try {
    console.log("🏗️ Setting up complete notification test environment...\n")
    
    // 1. Get trader
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    // Create session if needed
    let session = await db.session.findFirst({
      where: {
        userId: trader.id,
        expiredAt: { gt: new Date() }
      }
    })
    
    if (!session) {
      session = await db.session.create({
        data: {
          token: `test-session-${Date.now()}`,
          userId: trader.id,
          ip: "127.0.0.1",
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })
    }
    
    console.log(`✅ Trader: ${trader.email}`)
    
    // 2. Create device
    console.log("\n📱 Creating device...")
    const deviceName = "Test Device for Notifications"
    const deviceToken = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    const device = await db.device.create({
      data: {
        name: deviceName,
        token: deviceToken,
        userId: trader.id,
        energy: 85,
        ethernetSpeed: 100,
        isOnline: false
      }
    })
    
    console.log(`✅ Device created: ${device.name}`)
    console.log(`   Token: ${device.token.substring(0, 20)}...`)
    
    // 3. Create bank detail
    console.log("\n🏦 Creating bank detail...")
    const bankDetail = await db.bankDetail.create({
      data: {
        cardNumber: "4276555566667777",
        bankType: "SBERBANK",
        methodType: "c2c",
        recipientName: "Тест Уведомлений",
        phoneNumber: "+79001234567",
        minAmount: 100,
        maxAmount: 100000,
        dailyLimit: 1000000,
        monthlyLimit: 10000000,
        intervalMinutes: 0,
        userId: trader.id,
        deviceId: device.id
      }
    })
    
    console.log(`✅ Bank detail created: ${bankDetail.recipientName}`)
    console.log(`   Linked to device: ${!!bankDetail.deviceId}`)
    
    // 4. Create test transactions with specific amounts
    console.log("\n💰 Creating test transactions...")
    const testAmounts = [1000, 2500, 5000, 7500, 10000, 15000, 25000]
    
    // Find or create merchant and method
    let merchant = await db.merchant.findFirst()
    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          name: "Test Merchant",
          token: `merchant-${Date.now()}`,
          balanceUsdt: 1000000
        }
      })
    }
    
    let method = await db.method.findFirst()
    if (!method) {
      method = await db.method.create({
        data: {
          code: "test-c2c",
          name: "Test C2C",
          type: "c2c",
          commissionPayin: 0.02,
          commissionPayout: 0.02,
          maxPayin: 1000000,
          minPayin: 100,
          maxPayout: 1000000,
          minPayout: 100,
          chancePayin: 0.95,
          chancePayout: 0.95
        }
      })
    }
    
    const transactions = []
    for (const amount of testAmounts) {
      const tx = await db.transaction.create({
        data: {
          amount,
          assetOrBank: "SBERBANK",
          orderId: `test-${amount}-${Date.now()}`,
          currency: "RUB",
          userId: trader.id,
          callbackUri: "http://localhost:3000/callback",
          successUri: "http://localhost:3000/success",
          failUri: "http://localhost:3000/fail",
          status: "CREATED",
          type: "IN",
          expired_at: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
          commission: amount * 0.02,
          clientName: "Test Client",
          bankDetailId: bankDetail.id,
          merchantId: merchant.id,
          methodId: method.id,
          traderId: trader.id
        }
      })
      transactions.push(tx)
      console.log(`   ✅ ${amount} RUB`)
    }
    
    // 5. Configure Device Emulator Service
    console.log("\n🤖 Configuring Device Emulator Service...")
    await db.serviceConfig.upsert({
      where: { serviceKey: "device_emulator" },
      create: {
        serviceKey: "device_emulator",
        config: {
          global: {
            defaultPingSec: 30,
            defaultNotifyChance: 0.9,
            defaultSpamChance: 0.05,
            defaultDelayChance: 0.02,
            reconnectOnAuthError: true,
            rngSeed: Date.now()
          },
          devices: [{
            deviceCode: device.token,
            bankType: "SBER",
            model: device.name,
            androidVersion: "13",
            initialBattery: 85,
            pingSec: 20,
            notifyChance: 0.95, // 95% chance
            spamChance: 0.03,
            delayChance: 0.02,
            notifyIntervalSec: 10, // Every 10 seconds (if patch is applied)
            testAmounts: testAmounts // Use created amounts
          }]
        },
        isEnabled: true,
      },
      update: {
        config: {
          global: {
            defaultPingSec: 30,
            defaultNotifyChance: 0.9,
            defaultSpamChance: 0.05,
            defaultDelayChance: 0.02,
            reconnectOnAuthError: true,
            rngSeed: Date.now()
          },
          devices: [{
            deviceCode: device.token,
            bankType: "SBER",
            model: device.name,
            androidVersion: "13",
            initialBattery: 85,
            pingSec: 20,
            notifyChance: 0.95,
            spamChance: 0.03,
            delayChance: 0.02,
            notifyIntervalSec: 10,
            testAmounts: testAmounts
          }]
        },
        isEnabled: true,
      }
    })
    
    console.log("✅ Emulator configured with high frequency")
    console.log(`   Notification rate: 95% every ~10-20 seconds`)
    
    // 6. Connect the device
    console.log("\n🔌 Connecting device...")
    try {
      const connectResponse = await httpClient.post("http://localhost:3000/api/device/connect", {
        deviceCode: device.token,
        batteryLevel: 85,
        networkInfo: "Wi-Fi",
        deviceModel: device.name,
        androidVersion: "13",
        appVersion: "2.0.0",
      })
      
      console.log("✅ Device connected successfully")
      
      // Update device status
      await db.device.update({
        where: { id: device.id },
        data: { 
          isOnline: true,
          lastActiveAt: new Date()
        }
      })
      
    } catch (error) {
      console.log(`⚠️  Device connection failed: ${error.message}`)
      console.log("   The emulator will try to connect automatically")
    }
    
    // 7. Summary
    console.log("\n🎉 Setup Complete!")
    console.log("\n📊 Summary:")
    console.log(`   Device: ${device.name} (${device.token.substring(0, 20)}...)`)
    console.log(`   Bank Detail: ${bankDetail.recipientName} (${bankDetail.bankType})`)
    console.log(`   Transactions: ${transactions.length} with amounts: ${testAmounts.join(', ')}`)
    console.log(`   Emulator: Configured with 95% notification rate`)
    
    console.log("\n🎯 Expected behavior:")
    console.log("   - Device Emulator Service will connect the device")
    console.log("   - Notifications every 10-20 seconds")
    console.log("   - 95% of notifications will use real transaction amounts")
    console.log("   - NotificationMatcherService will process and match them")
    console.log("   - High probability of successful matches")
    
    console.log("\n📖 Monitor with:")
    console.log("   - Service logs in the terminal")
    console.log("   - Run: npx tsx scripts/check-emulator-status.ts")
    console.log("   - Check notifications table for new entries")
    console.log("   - Watch for 'NotificationMatcherService' logs")
    
    console.log("\n⚠️  Important:")
    console.log("   - Make sure DES_ENABLED=true is set")
    console.log("   - The server might need a restart to pick up the new config")
    console.log("   - If no notifications appear, run: npx tsx scripts/send-test-notifications.ts")
    
  } catch (error) {
    console.error("❌ Setup error:", error)
  } finally {
    await db.$disconnect()
  }
}

setupCompleteNotificationTest()