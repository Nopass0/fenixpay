import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function debugDeviceConnection() {
  try {
    console.log("🐛 Debugging device connection issue...\n")
    
    // 1. Проверяем конфигурацию эмулятора
    const emulatorConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    const config = emulatorConfig?.config as any
    const emulatedDevice = config.devices[0]
    const deviceCode = emulatedDevice.deviceCode
    
    console.log("🔍 Device code from config:", deviceCode.substring(0, 20) + "...")
    
    // 2. Проверяем устройство в БД
    const device = await db.device.findFirst({
      where: { token: deviceCode },
      include: {
        bankDetails: true,
        user: true
      }
    })
    
    if (!device) {
      console.log("❌ Device not found in database!")
      return
    }
    
    console.log("✅ Device found:")
    console.log(`   ID: ${device.id}`)
    console.log(`   Name: ${device.name}`)
    console.log(`   Token matches: ${device.token === deviceCode}`)
    console.log(`   User: ${device.user.email}`)
    console.log(`   Online: ${device.isOnline}`)
    console.log(`   Bank details: ${device.bankDetails.length}`)
    
    // 3. Попробуем разные варианты подключения
    console.log("\n🔌 Testing different connection approaches...")
    
    const connectionTests = [
      {
        name: "Standard connection",
        data: {
          deviceCode: deviceCode,
          batteryLevel: 85,
          networkInfo: "Wi-Fi",
          deviceModel: device.name,
          androidVersion: "13",
          appVersion: "2.0.0",
        }
      },
      {
        name: "Minimal connection",
        data: {
          deviceCode: deviceCode,
          batteryLevel: 85,
          networkInfo: "Wi-Fi",
          deviceModel: "Emulated Device",
          androidVersion: "13",
          appVersion: "2.0.0",
        }
      }
    ]
    
    for (const test of connectionTests) {
      console.log(`\n   Testing: ${test.name}`)
      
      try {
        const response = await httpClient.post(
          "http://localhost:3000/api/device/connect", 
          test.data
        )
        
        console.log(`   ✅ Success: ${test.name}`)
        console.log(`   Token: ${response.token.substring(0, 16)}...`)
        console.log(`   Status: ${response.status}`)
        console.log(`   Message: ${response.message}`)
        
        // Если подключение успешно, проверим статус устройства
        const updatedDevice = await db.device.findUnique({
          where: { id: device.id }
        })
        
        console.log(`   Device online after connection: ${updatedDevice?.isOnline}`)
        console.log(`   Last active: ${updatedDevice?.lastActiveAt}`)
        
        break // Успешно подключились, выходим из цикла
        
      } catch (error: any) {
        console.log(`   ❌ Failed: ${test.name}`)
        console.log(`   Error: ${error.message}`)
        
        if (error.response) {
          console.log(`   Response:`, JSON.stringify(error.response).substring(0, 200))
        }
      }
    }
    
    // 4. Проверяем состояние API
    console.log("\n🌐 Testing API endpoints...")
    
    try {
      const pingResponse = await httpClient.get("http://localhost:3000/api/device/ping")
      console.log("✅ Device API ping successful:", pingResponse.message)
    } catch (error: any) {
      console.log("❌ Device API ping failed:", error.message)
    }
    
    // 5. Проверяем, есть ли уже подключенные устройства
    console.log("\n📱 Checking all devices in database...")
    
    const allDevices = await db.device.findMany({
      include: {
        user: true,
        bankDetails: true
      }
    })
    
    console.log(`Found ${allDevices.length} total devices:`)
    allDevices.forEach((d, index) => {
      console.log(`   ${index + 1}. ${d.name} (${d.user.email})`)
      console.log(`      Online: ${d.isOnline}, Token: ${d.token.substring(0, 16)}...`)
      console.log(`      Bank details: ${d.bankDetails.length}`)
    })
    
    // 6. Проверяем, запущен ли Device Emulator Service
    console.log("\n🤖 Device Emulator Service status:")
    console.log(`   Enabled: ${emulatorConfig?.isEnabled}`)
    console.log(`   Environment DES_ENABLED: ${process.env.DES_ENABLED}`)
    
  } catch (error: any) {
    console.error("\n❌ Debug error:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

debugDeviceConnection()