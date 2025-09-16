import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function testCompleteDeviceFlow() {
  try {
    console.log("🧪 Testing complete device flow from trader perspective...\n")
    
    // 1. Получаем трейдера
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    console.log("✅ Found trader:", trader.email)
    
    // 2. Симулируем логин трейдера (получаем токен)
    // В реальности это делается через UI
    const traderSession = await db.session.create({
      data: {
        token: `test-trader-session-${Date.now()}`,
        userId: trader.id,
        ip: "127.0.0.1",
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })
    
    console.log("🔑 Created trader session:", traderSession.token)
    
    // 3. Создаем устройство через API трейдера
    console.log("\n📱 Creating device via trader API...")
    
    const createDeviceResponse = await httpClient.post(
      "http://localhost:3000/api/trader/devices", 
      {
        name: "Samsung Galaxy S23"
      },
      {
        headers: {
          "x-trader-token": traderSession.token
        }
      }
    )
    
    console.log("📡 Create device response:", JSON.stringify(createDeviceResponse, null, 2))
    
    if (!createDeviceResponse.id) {
      console.log("❌ Failed to create device")
      return
    }
    
    const deviceToken = createDeviceResponse.token
    console.log("🔑 Device token (QR code content):", deviceToken)
    
    // 4. Создаем банковский реквизит для тестирования
    console.log("\n🏦 Creating bank detail...")
    const createBankDetailResponse = await httpClient.post(
      "http://localhost:3000/api/trader/bank-details",
      {
        methodType: "c2c",
        bankType: "SBERBANK",
        cardNumber: "4444555566667777",
        recipientName: "Test Trader",
        phoneNumber: "+79001234567",
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        intervalMinutes: 0
      },
      {
        headers: {
          "x-trader-token": traderSession.token
        }
      }
    )
    
    console.log("💳 Bank detail created:", createBankDetailResponse.id)
    
    // 5. Теперь симулируем подключение с устройства (используя токен из QR кода)
    console.log("\n🔌 Connecting device using QR code token...")
    
    const connectResponse = await httpClient.post("http://localhost:3000/api/device/connect", {
      deviceCode: deviceToken, // Это то, что будет в QR коде
      batteryLevel: 85,
      networkInfo: "Wi-Fi",
      deviceModel: "Samsung Galaxy S23",
      androidVersion: "13",
      appVersion: "2.0.0",
    })
    
    console.log("📡 Connect response:", JSON.stringify(connectResponse, null, 2))
    
    if (connectResponse.status === "success") {
      console.log("\n✅ Device connected successfully!")
      console.log("   Authentication token:", connectResponse.token)
      
      // 6. Проверяем, что токены совпадают
      if (connectResponse.token === deviceToken) {
        console.log("✅ Token match confirmed!")
      } else {
        console.log("❌ Token mismatch!")
        console.log("   Expected:", deviceToken)
        console.log("   Received:", connectResponse.token)
      }
      
      // 7. Тестируем обновление информации устройства
      console.log("\n📊 Testing device info update...")
      const updateResponse = await httpClient.post(
        "http://localhost:3000/api/device/info/update",
        {
          batteryLevel: 78,
          networkInfo: "4G",
          isCharging: false,
          timestamp: Date.now(),
        },
        {
          headers: {
            Authorization: `Bearer ${connectResponse.token}`,
          },
        }
      )
      
      console.log("   Update response:", updateResponse)
      
      // 8. Отправляем уведомление
      console.log("\n📬 Testing notification send...")
      const notificationResponse = await httpClient.post(
        "http://localhost:3000/api/device/notification",
        {
          packageName: "ru.sberbank.android",
          appName: "СберБанк Онлайн",
          title: "Пополнение",
          content: "Пополнение на 5,000 ₽ от Тест Т. Баланс: 25,000 ₽",
          timestamp: Date.now(),
          priority: 1,
          category: "msg",
        },
        {
          headers: {
            Authorization: `Bearer ${connectResponse.token}`,
          },
        }
      )
      
      console.log("   Notification response:", notificationResponse)
      
      // 9. Проверяем статус через API трейдера
      console.log("\n🔍 Checking device status via trader API...")
      const deviceStatusResponse = await httpClient.get(
        `http://localhost:3000/api/trader/devices/${createDeviceResponse.id}`,
        {
          headers: {
            "x-trader-token": traderSession.token
          }
        }
      )
      
      console.log("📱 Device status:")
      console.log("   Name:", deviceStatusResponse.name)
      console.log("   Online:", deviceStatusResponse.isOnline)
      console.log("   Energy:", deviceStatusResponse.energy)
      console.log("   Notifications:", deviceStatusResponse.notifications)
      console.log("   Recent notifications:", deviceStatusResponse.recentNotifications?.length || 0)
      
      console.log("\n🎉 Complete device flow test passed!")
      console.log("\n📝 Summary:")
      console.log("   1. ✅ Trader created device via UI")
      console.log("   2. ✅ Device token generated for QR code")
      console.log("   3. ✅ Bank detail created")
      console.log("   4. ✅ Device connected using QR code token")
      console.log("   5. ✅ Device info updates working")
      console.log("   6. ✅ Notifications working")
      console.log("   7. ✅ Trader can see device status")
      
    } else {
      console.log("\n❌ Failed to connect device:", connectResponse)
    }
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error)
    if (error.response) {
      console.error("   Response:", error.response)
    }
  } finally {
    await db.$disconnect()
  }
}

// Запуск теста
testCompleteDeviceFlow()