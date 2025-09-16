import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function simulateFrontendFlow() {
  try {
    console.log("🎭 Simulating complete frontend flow...\n")
    
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    // 1. Симулируем логин трейдера
    const session = await db.session.create({
      data: {
        token: `frontend-flow-${Date.now()}`,
        userId: trader.id,
        ip: "127.0.0.1",
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })
    
    console.log("🔑 Created session:", session.token.substring(0, 20) + "...")
    
    // 2. Получаем список устройств (как это делает фронтенд)
    console.log("\n📱 Step 1: Getting devices list...")
    const devicesResponse = await httpClient.get(
      "http://localhost:3000/api/trader/devices",
      { headers: { "x-trader-token": session.token } }
    )
    
    console.log(`✅ Found ${devicesResponse.length} devices`)
    
    if (devicesResponse.length === 0) {
      console.log("No devices found. Creating one...")
      
      // Создаем устройство
      const newDevice = await httpClient.post(
        "http://localhost:3000/api/trader/devices", 
        { name: "Frontend Flow Test Device" },
        { headers: { "x-trader-token": session.token } }
      )
      
      console.log("✅ Created device:", newDevice.id)
      
      // Получаем список снова
      const devicesAfterCreate = await httpClient.get(
        "http://localhost:3000/api/trader/devices",
        { headers: { "x-trader-token": session.token } }
      )
      
      console.log(`✅ After creation: ${devicesAfterCreate.length} devices`)
    }
    
    // 3. Получаем детали первого устройства
    const firstDevice = devicesResponse[0] || (await httpClient.get(
      "http://localhost:3000/api/trader/devices",
      { headers: { "x-trader-token": session.token } }
    ))[0]
    
    if (firstDevice) {
      console.log(`\n🔍 Step 2: Getting device details for ${firstDevice.name}...`)
      
      try {
        const deviceDetails = await httpClient.get(
          `http://localhost:3000/api/trader/devices/${firstDevice.id}`,
          { headers: { "x-trader-token": session.token } }
        )
        
        console.log("✅ Device details retrieved:")
        console.log(`   Name: ${deviceDetails.name}`)
        console.log(`   Online: ${deviceDetails.isOnline}`)
        console.log(`   Energy: ${deviceDetails.energy}`)
        console.log(`   Bank Details: ${deviceDetails.linkedBankDetails?.length || 0}`)
        console.log(`   Notifications: ${deviceDetails.notifications}`)
        
      } catch (error: any) {
        console.log("❌ Error getting device details:", error.message)
        console.log("   This could be why frontend shows device as 'disappeared'")
      }
    }
    
    // 4. Получаем банковские реквизиты
    console.log("\n🏦 Step 3: Getting bank details...")
    const bankDetails = await httpClient.get(
      "http://localhost:3000/api/trader/bank-details",
      { headers: { "x-trader-token": session.token } }
    )
    
    console.log(`✅ Found ${bankDetails.length} bank details`)
    
    // 5. Симулируем изменение конфигурации эмулятора
    console.log("\n🤖 Step 4: Simulating emulator config change...")
    
    const emulatorConfig = {
      global: {
        defaultPingSec: 45,
        defaultNotifyChance: 0.6,
        defaultSpamChance: 0.1,
        defaultDelayChance: 0.1,
        reconnectOnAuthError: true,
      },
      devices: [
        {
          deviceCode: "test-emulated-device-123456",
          bankType: "SBER",
          model: "Emulated Test",
          androidVersion: "13",
          initialBattery: 90,
          pingSec: 45,
          notifyChance: 0.9,
          spamChance: 0.1,
          delayChance: 0.1
        }
      ]
    }
    
    await db.serviceConfig.upsert({
      where: { serviceKey: "device_emulator" },
      create: {
        serviceKey: "device_emulator",
        config: emulatorConfig,
        isEnabled: true,
      },
      update: {
        config: emulatorConfig,
        isEnabled: true,
      }
    })
    
    console.log("✅ Emulator config changed")
    
    // 6. Проверяем устройства после изменения конфигурации
    console.log("\n📱 Step 5: Checking devices after config change...")
    
    try {
      const devicesAfterConfig = await httpClient.get(
        "http://localhost:3000/api/trader/devices",
        { headers: { "x-trader-token": session.token } }
      )
      
      console.log(`✅ Found ${devicesAfterConfig.length} devices after config change`)
      
      if (firstDevice) {
        try {
          const deviceDetailsAfter = await httpClient.get(
            `http://localhost:3000/api/trader/devices/${firstDevice.id}`,
            { headers: { "x-trader-token": session.token } }
          )
          
          console.log("✅ Device details still accessible after config change")
          
        } catch (error: any) {
          console.log("❌ Device details not accessible after config change:", error.message)
          console.log("   This is likely the source of the 'disappeared device' issue")
        }
      }
      
    } catch (error: any) {
      console.log("❌ Error getting devices after config change:", error.message)
    }
    
    console.log("\n📊 Summary:")
    console.log("   This simulation tests the exact flow that frontend uses")
    console.log("   If any step fails, it could explain why devices 'disappear'")
    
  } catch (error: any) {
    console.error("\n❌ Error in simulation:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

simulateFrontendFlow()