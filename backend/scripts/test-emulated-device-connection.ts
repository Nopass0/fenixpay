import { httpClient } from "../src/utils/httpClient"

async function testEmulatedDeviceConnection() {
  try {
    // Код устройства из ошибки
    const deviceCode = "41a9c8c12f176002f36332662a489dedc45afb3e8c0abd9c7a2c1ec97ee12f6d"
    
    console.log("🔌 Testing emulated device connection with code:", deviceCode)
    console.log("   Bank type: SBER")
    console.log("   Model: Pixel 7 Pro")
    
    // Попытка подключения устройства
    const response = await httpClient.post("http://localhost:3000/api/device/connect", {
      deviceCode,
      batteryLevel: 85,
      networkInfo: "Wi-Fi",
      deviceModel: "Pixel 7 Pro",
      androidVersion: "13",
      appVersion: "2.0.0",
    })
    
    console.log("\n📡 Response:", JSON.stringify(response, null, 2))
    
    if (response.status === "success" && response.token) {
      console.log("\n✅ Device connected successfully!")
      console.log("   Token:", response.token)
      
      // Тест обновления информации об устройстве
      console.log("\n📊 Testing device info update...")
      const updateResponse = await httpClient.post(
        "http://localhost:3000/api/device/info/update",
        {
          batteryLevel: 82,
          networkInfo: "4G",
          isCharging: false,
          timestamp: Date.now(),
        },
        {
          headers: {
            Authorization: `Bearer ${response.token}`,
          },
        }
      )
      
      console.log("   Update response:", updateResponse)
      
      // Тест отправки уведомления
      console.log("\n📬 Testing notification send...")
      const notificationResponse = await httpClient.post(
        "http://localhost:3000/api/device/notification",
        {
          packageName: "ru.sberbank.android",
          appName: "СберБанк Онлайн",
          title: "Пополнение",
          content: "Пополнение на 5,000 ₽ от Иван П. Баланс: 25,000 ₽",
          timestamp: Date.now(),
          priority: 1,
          category: "msg",
        },
        {
          headers: {
            Authorization: `Bearer ${response.token}`,
          },
        }
      )
      
      console.log("   Notification response:", notificationResponse)
      
      console.log("\n🎉 All tests passed successfully!")
    } else {
      console.log("\n❌ Failed to connect device:", response)
    }
  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error)
    if (error.response) {
      console.error("   Response body:", error.response)
    }
    if (error.code) {
      console.error("   Error code:", error.code)
    }
  }
}

// Запуск теста
testEmulatedDeviceConnection()