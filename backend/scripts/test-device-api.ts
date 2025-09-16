import { db } from "../src/db"

async function testDeviceApi() {
  try {
    // First check what's in the database
    const device = await db.device.findFirst({
      where: { 
        token: "2e5cf2e90bd27ec6a50021308abf85b92ac463f889f3eaee5a20b1f8b2906252"
      },
      include: {
        bankDetails: true
      }
    })
    
    if (device) {
      console.log("✅ Device found:")
      console.log("   ID:", device.id)
      console.log("   Name:", device.name)
      console.log("   Token:", device.token)
      console.log("   Is Online:", device.isOnline)
      console.log("   Bank Details:", device.bankDetails.length)
      
      if (device.bankDetails.length > 0) {
        console.log("\n📋 Bank Details:")
        device.bankDetails.forEach(bd => {
          console.log(`   - ${bd.bankType} ${bd.cardNumber} (ID: ${bd.id})`)
        })
      }
    } else {
      console.log("❌ Device not found")
    }
    
    // Now test the API with raw fetch
    console.log("\n🔌 Testing device connection API...")
    
    const response = await fetch("http://localhost:3000/api/device/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceCode: "44ced67929fae48a0f72699c3a6b074608de7459c9d4e0587297df0188ae2833",
        batteryLevel: 85,
        networkInfo: "Wi-Fi",
        deviceModel: "Pixel 7 Pro",
        androidVersion: "13",
        appVersion: "2.0.0"
      })
    })
    
    const result = await response.json()
    console.log("   Status:", response.status)
    console.log("   Response:", result)
    
  } catch (error: any) {
    console.error("❌ Error:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

testDeviceApi()