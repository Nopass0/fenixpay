import { db } from "../src/db"
import { httpClient } from "../src/utils/httpClient"

async function testDeviceApiCalls() {
  try {
    console.log("🧪 Testing device API calls...\n")
    
    // Get trader session
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        sessions: {
          where: { expiredAt: { gt: new Date() } },
          take: 1
        }
      }
    })
    
    if (!trader || !trader.sessions[0]) {
      console.log("❌ No trader or session found")
      return
    }
    
    const sessionToken = trader.sessions[0].token
    console.log(`✅ Using session: ${sessionToken.substring(0, 16)}...`)
    
    // 1. Get all devices
    console.log("\n📱 Getting all devices...")
    try {
      const devicesResponse = await httpClient.get(
        "http://localhost:3000/api/trader/devices",
        {
          headers: { "x-trader-token": sessionToken }
        }
      )
      
      console.log(`✅ Found ${devicesResponse.length} devices:`)
      devicesResponse.forEach((device, index) => {
        console.log(`   ${index + 1}. ${device.name}`)
        console.log(`      ID: ${device.id}`)
        console.log(`      Token: ${device.token?.substring(0, 20)}...`)
        console.log(`      Online: ${device.isOnline}`)
      })
      
      // 2. Test getting each device by ID
      if (devicesResponse.length > 0) {
        console.log("\n🔍 Testing individual device endpoints...")
        
        for (const device of devicesResponse) {
          console.log(`\n   Testing device: ${device.id}`)
          try {
            const deviceDetail = await httpClient.get(
              `http://localhost:3000/api/trader/devices/${device.id}`,
              {
                headers: { "x-trader-token": sessionToken }
              }
            )
            console.log(`   ✅ Success: ${deviceDetail.name}`)
          } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`)
          }
        }
      }
      
      // 3. Test with wrong ID
      console.log("\n🧪 Testing with invalid ID...")
      const fakeId = "invalid-device-id-12345"
      try {
        await httpClient.get(
          `http://localhost:3000/api/trader/devices/${fakeId}`,
          {
            headers: { "x-trader-token": sessionToken }
          }
        )
        console.log("   ⚠️  Unexpectedly succeeded")
      } catch (error) {
        console.log(`   ✅ Expected error: ${error.message}`)
      }
      
      // 4. Test device from another user (if exists)
      const anotherUserDevice = await db.device.findFirst({
        where: {
          userId: { not: trader.id }
        }
      })
      
      if (anotherUserDevice) {
        console.log("\n🧪 Testing with device from another user...")
        console.log(`   Device ID: ${anotherUserDevice.id}`)
        try {
          await httpClient.get(
            `http://localhost:3000/api/trader/devices/${anotherUserDevice.id}`,
            {
              headers: { "x-trader-token": sessionToken }
            }
          )
          console.log("   ⚠️  Security issue: accessed another user's device!")
        } catch (error) {
          console.log(`   ✅ Expected error: ${error.message}`)
        }
      }
      
    } catch (error) {
      console.log(`❌ API error: ${error.message}`)
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

testDeviceApiCalls()