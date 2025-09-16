import { httpClient } from "../src/utils/httpClient"

async function testDeviceConnection() {
  try {
    const deviceCode = "2e5cf2e90bd27ec6a50021308abf85b92ac463f889f3eaee5a20b1f8b2906252"
    
    console.log("🔌 Testing device connection with token:", deviceCode)
    
    // Try to connect the device
    const response = await httpClient.post("http://localhost:3000/api/device/connect", {
      deviceCode,
      batteryLevel: 85,
      networkInfo: "Wi-Fi",
      deviceModel: "Pixel 7 Pro",
      androidVersion: "13",
      appVersion: "2.0.0",
    })
    
    console.log("📡 Response:", response)
    
    if (response.status === "success" && response.token) {
      console.log("✅ Device connected successfully!")
      console.log("   Token:", response.token)
      
      // Now try to update device info
      const updateResponse = await httpClient.post(
        "http://localhost:3000/api/device/info/update",
        {
          batteryLevel: 85,
          networkInfo: "Wi-Fi",
        },
        {
          headers: {
            Authorization: `Bearer ${response.token}`,
          },
        }
      )
      
      console.log("📊 Update response:", updateResponse)
    } else {
      console.log("❌ Failed to connect device:", response)
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message || error)
    if (error.response) {
      console.error("   Response:", error.response)
    }
  }
}

testDeviceConnection()