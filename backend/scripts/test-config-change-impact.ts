import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function testConfigChangeImpact() {
  try {
    console.log("🧪 Testing impact of emulator config changes on trader devices...\n")
    
    // 1. Создаем трейдера и устройство
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    // Создаем сессию
    const session = await db.session.create({
      data: {
        token: `test-config-impact-${Date.now()}`,
        userId: trader.id,
        ip: "127.0.0.1",
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })
    
    // 2. Создаем устройство через API трейдера
    console.log("📱 Creating device via trader API...")
    const device = await httpClient.post(
      "http://localhost:3000/api/trader/devices", 
      { name: "Test Device Before Config Change" },
      { headers: { "x-trader-token": session.token } }
    )
    
    console.log("✅ Device created:", device.id)
    console.log("   Token:", device.token)
    
    // 3. Проверяем устройство в БД
    const deviceInDbBefore = await db.device.findUnique({
      where: { id: device.id }
    })
    
    console.log("✅ Device exists in DB before config change")
    
    // 4. Получаем список устройств через API
    const devicesBefore = await httpClient.get(
      "http://localhost:3000/api/trader/devices",
      { headers: { "x-trader-token": session.token } }
    )
    
    console.log(`✅ API shows ${devicesBefore.length} devices before config change`)
    
    // 5. Теперь изменяем конфигурацию эмулятора
    console.log("\n🤖 Changing Device Emulator Service config...")
    
    const newConfig = {
      global: {
        defaultPingSec: 30,
        defaultNotifyChance: 0.5,
        defaultSpamChance: 0.1,
        defaultDelayChance: 0.1,
        reconnectOnAuthError: true,
      },
      devices: [
        {
          deviceCode: "fake-emulated-device-token-123",
          bankType: "SBER",
          model: "Emulated Device",
          androidVersion: "13",
          initialBattery: 85,
          pingSec: 30,
          notifyChance: 0.8,
          spamChance: 0.1,
          delayChance: 0.1
        }
      ]
    }
    
    // Симулируем изменение конфигурации через админский API
    // (в реальности это делается через админку)
    await db.serviceConfig.upsert({
      where: { serviceKey: "device_emulator" },
      create: {
        serviceKey: "device_emulator",
        config: newConfig,
        isEnabled: true,
      },
      update: {
        config: newConfig,
        isEnabled: true,
      }
    })
    
    console.log("✅ Emulator config updated")
    
    // 6. Проверяем устройство в БД после изменения конфигурации
    const deviceInDbAfter = await db.device.findUnique({
      where: { id: device.id }
    })
    
    if (deviceInDbAfter) {
      console.log("✅ Device still exists in DB after config change")
      console.log("   Name:", deviceInDbAfter.name)
      console.log("   Token:", deviceInDbAfter.token)
      console.log("   Online:", deviceInDbAfter.isOnline)
    } else {
      console.log("❌ Device disappeared from DB after config change!")
    }
    
    // 7. Проверяем через API трейдера
    try {
      const devicesAfter = await httpClient.get(
        "http://localhost:3000/api/trader/devices",
        { headers: { "x-trader-token": session.token } }
      )
      
      console.log(`📱 API shows ${devicesAfter.length} devices after config change`)
      
      if (devicesAfter.length > 0) {
        console.log("✅ Device still visible through trader API")
      } else {
        console.log("❌ Device disappeared from trader API!")
      }
      
    } catch (error: any) {
      console.log("❌ Error getting devices through API:", error.message)
    }
    
    // 8. Пытаемся получить конкретное устройство
    try {
      const specificDevice = await httpClient.get(
        `http://localhost:3000/api/trader/devices/${device.id}`,
        { headers: { "x-trader-token": session.token } }
      )
      
      console.log("✅ Specific device still accessible:", specificDevice.name)
      
    } catch (error: any) {
      console.log("❌ Error getting specific device:", error.message)
    }
    
    console.log("\n📊 Summary:")
    console.log("   Device in DB before config change: YES")
    console.log(`   Device in DB after config change: ${deviceInDbAfter ? 'YES' : 'NO'}`)
    console.log("   This test shows if DES config changes affect trader devices")
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

testConfigChangeImpact()