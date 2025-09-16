import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function testDeviceAPI() {
  try {
    console.log("🧪 Testing device API endpoints...\n")
    
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: { devices: true }
    })
    
    if (!trader || trader.devices.length === 0) {
      console.log("❌ No trader or devices found")
      return
    }
    
    // Создаем сессию
    const session = await db.session.create({
      data: {
        token: `test-device-api-${Date.now()}`,
        userId: trader.id,
        ip: "127.0.0.1",
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })
    
    console.log("🔑 Created session:", session.token)
    
    // Тестируем GET /trader/devices (список)
    console.log("\n📱 Testing GET /trader/devices...")
    try {
      const devicesResponse = await httpClient.get(
        "http://localhost:3000/api/trader/devices",
        {
          headers: { "x-trader-token": session.token }
        }
      )
      
      console.log(`✅ Found ${devicesResponse.length} devices in API response`)
      if (devicesResponse.length > 0) {
        console.log("   First device:", devicesResponse[0].name, devicesResponse[0].id)
      }
    } catch (error: any) {
      console.log("❌ Error getting devices list:", error.message)
    }
    
    // Тестируем GET /trader/devices/{id} для каждого устройства
    console.log("\n🔍 Testing GET /trader/devices/{id} for each device...")
    
    for (let i = 0; i < Math.min(trader.devices.length, 3); i++) { // Тестируем только первые 3
      const device = trader.devices[i]
      console.log(`\n   Testing device ${i + 1}: ${device.name} (${device.id})`)
      
      try {
        const deviceResponse = await httpClient.get(
          `http://localhost:3000/api/trader/devices/${device.id}`,
          {
            headers: { "x-trader-token": session.token }
          }
        )
        
        console.log(`   ✅ Success: ${deviceResponse.name}`)
        console.log(`      Online: ${deviceResponse.isOnline}`)
        console.log(`      Bank details: ${deviceResponse.linkedBankDetails?.length || 0}`)
        
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`)
        if (error.response) {
          console.log(`      Response: ${JSON.stringify(error.response)}`)
        }
      }
    }
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

testDeviceAPI()