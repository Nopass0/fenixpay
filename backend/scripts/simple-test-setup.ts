import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function simpleTestSetup() {
  try {
    console.log("🧪 Simple test setup...\n")
    
    // 1. Get trader session
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        sessions: {
          where: { expiredAt: { gt: new Date() } },
          take: 1
        }
      }
    })
    
    const sessionToken = trader.sessions[0]?.token
    console.log(`✅ Using session: ${sessionToken?.substring(0, 16)}...`)
    
    // 2. Create device
    console.log("\n📱 Creating device...")
    const deviceResponse = await httpClient.post(
      "http://localhost:3000/api/trader/devices",
      { name: "Simple Test Device" },
      { headers: { "x-trader-token": sessionToken } }
    )
    console.log(`✅ Device: ${deviceResponse.name} (${deviceResponse.id})`)
    
    // 3. Create bank detail WITHOUT device link first
    console.log("\n🏦 Creating bank detail...")
    const bankDetailResponse = await httpClient.post(
      "http://localhost:3000/api/trader/bank-details",
      {
        cardNumber: "4444555566667777",
        bankType: "SBER",
        methodType: "c2c",
        recipientName: "Simple Test",
        phoneNumber: "+79001234567",
        minAmount: 100,
        maxAmount: 50000,
        intervalMinutes: 0
        // No deviceId initially
      },
      { headers: { "x-trader-token": sessionToken } }
    )
    console.log(`✅ Bank Detail: ${bankDetailResponse.recipientName} (${bankDetailResponse.id})`)
    
    // 4. Link device to bank detail
    console.log("\n🔗 Linking device to bank detail...")
    try {
      const linkResponse = await httpClient.post(
        "http://localhost:3000/api/trader/devices/link",
        {
          deviceId: deviceResponse.id,
          bankDetailId: bankDetailResponse.id
        },
        { headers: { "x-trader-token": sessionToken } }
      )
      console.log("✅ Device linked to bank detail")
    } catch (linkError) {
      console.log("⚠️  Link failed, but continuing...")
    }
    
    // 5. Create simple test transaction
    console.log("\n💰 Creating test transaction...")
    const transaction = await db.transaction.create({
      data: {
        amount: 1000,
        currency: "RUB",
        status: "CREATED",
        type: "IN",
        bankDetailId: bankDetailResponse.id,
        userId: trader.id,
        merchantTransactionId: `simple-test-${Date.now()}`,
        description: "Simple test transaction"
      }
    })
    console.log(`✅ Transaction: ${transaction.amount} RUB (${transaction.id})`)
    
    // 6. Configure simple emulator
    console.log("\n🤖 Configuring emulator...")
    await db.serviceConfig.upsert({
      where: { serviceKey: "device_emulator" },
      create: {
        serviceKey: "device_emulator",
        config: {
          global: {
            defaultPingSec: 30,
            defaultNotifyChance: 0.8,
            defaultSpamChance: 0.1,
            defaultDelayChance: 0.1,
            reconnectOnAuthError: true
          },
          devices: [{
            deviceCode: deviceResponse.token,
            bankType: "SBER",
            model: deviceResponse.name,
            pingSec: 30,
            notifyChance: 0.9,
            spamChance: 0.1
          }]
        },
        isEnabled: true,
      },
      update: {
        config: {
          global: {
            defaultPingSec: 30,
            defaultNotifyChance: 0.8,
            defaultSpamChance: 0.1,
            defaultDelayChance: 0.1,
            reconnectOnAuthError: true
          },
          devices: [{
            deviceCode: deviceResponse.token,
            bankType: "SBER",
            model: deviceResponse.name,
            pingSec: 30,
            notifyChance: 0.9,
            spamChance: 0.1
          }]
        },
        isEnabled: true,
      }
    })
    console.log("✅ Emulator configured")
    
    // 7. Test device connection
    console.log("\n🔌 Testing device connection...")
    try {
      const connectResponse = await httpClient.post("http://localhost:3000/api/device/connect", {
        deviceCode: deviceResponse.token,
        batteryLevel: 85,
        networkInfo: "Wi-Fi",
        deviceModel: deviceResponse.name,
        androidVersion: "13",
        appVersion: "2.0.0",
      })
      
      console.log("✅ Device connected successfully")
      
      // 8. Send test notification
      console.log("\n📬 Sending test notification...")
      await httpClient.post(
        "http://localhost:3000/api/device/notification",
        {
          packageName: "ru.sberbank.android",
          appName: "СберБанк Онлайн",
          title: "Пополнение",
          content: "Пополнение на 1 000 ₽ от Test T. Баланс: 5 000 ₽",
          timestamp: Date.now(),
          priority: 1,
          category: "msg",
        },
        {
          headers: { Authorization: `Bearer ${connectResponse.token}` },
        }
      )
      console.log("✅ Test notification sent")
      
    } catch (error) {
      console.log(`❌ Connection/notification failed: ${error.message}`)
    }
    
    console.log("\n🎉 Simple setup complete!")
    console.log(`   Device: ${deviceResponse.id}`)
    console.log(`   Bank Detail: ${bankDetailResponse.id}`)
    console.log(`   Transaction: ${transaction.id}`)
    console.log("   Emulator: enabled with 90% notification rate every 30s")
    
  } catch (error: any) {
    console.error("❌ Setup error:", error.message)
    if (error.response?.data) {
      console.error("Details:", error.response.data)
    }
  } finally {
    await db.$disconnect()
  }
}

simpleTestSetup()