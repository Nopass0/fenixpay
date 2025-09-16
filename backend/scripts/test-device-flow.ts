import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"
import { randomBytes } from "crypto"

async function testDeviceFlow() {
  try {
    console.log("🧪 Testing new device flow...\n")
    
    // 1. Создаем устройство для трейдера
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    console.log("✅ Found trader:", trader.id)
    
    // Генерируем уникальный токен для устройства
    const deviceToken = randomBytes(32).toString('hex')
    console.log("🔑 Generated device token:", deviceToken)
    
    // Создаем устройство в БД (как это делает UI трейдера)
    const device = await db.device.create({
      data: {
        name: "Test Device (Emulated)",
        token: deviceToken,
        userId: trader.id,
        isOnline: false,
        emulated: true
      }
    })
    
    console.log("✅ Created device:", {
      id: device.id,
      name: device.name,
      token: device.token
    })
    
    // 2. Проверяем банковские детали
    const bankDetails = await db.bankDetail.findMany({
      where: {
        userId: trader.id,
        isArchived: false
      }
    })
    
    console.log(`\n📊 Found ${bankDetails.length} bank details for trader`)
    
    if (bankDetails.length === 0) {
      console.log("📝 Creating bank detail...")
      await db.bankDetail.create({
        data: {
          userId: trader.id,
          methodType: "c2c",
          bankType: "SBERBANK",
          cardNumber: "4444555566667777",
          recipientName: "Test Trader",
          phoneNumber: "+79001234567",
          minAmount: 100,
          maxAmount: 50000,
          dailyLimit: 500000,
          monthlyLimit: 5000000,
          intervalMinutes: 0,
          isArchived: false
        }
      })
    }
    
    // 3. Обновляем конфигурацию эмулятора с новым токеном
    console.log("\n🤖 Updating Device Emulator Service config...")
    
    const emulatorConfig = {
      global: {
        defaultPingSec: 30,
        defaultNotifyChance: 0.7,
        defaultSpamChance: 0.05,
        defaultDelayChance: 0.1,
        reconnectOnAuthError: true,
        rngSeed: Date.now()
      },
      devices: [
        {
          deviceCode: deviceToken, // Используем токен созданного устройства
          bankType: "SBER",
          model: "Pixel 7 Pro",
          androidVersion: "13",
          initialBattery: 85,
          pingSec: 30,
          notifyChance: 0.8,
          spamChance: 0.1,
          delayChance: 0.1
        }
      ]
    }
    
    await db.serviceConfig.update({
      where: { serviceKey: "device_emulator" },
      data: { 
        config: emulatorConfig,
        isEnabled: true
      }
    })
    
    console.log("✅ Updated emulator config with device token")
    
    // 4. Тестируем подключение устройства
    console.log("\n🔌 Testing device connection...")
    
    const connectResponse = await httpClient.post("http://localhost:3000/api/device/connect", {
      deviceCode: deviceToken,
      batteryLevel: 85,
      networkInfo: "Wi-Fi",
      deviceModel: "Pixel 7 Pro",
      androidVersion: "13",
      appVersion: "2.0.0",
    })
    
    console.log("📡 Connect response:", JSON.stringify(connectResponse, null, 2))
    
    if (connectResponse.status === "success") {
      console.log("\n✅ Device connected successfully!")
      console.log("   Token:", connectResponse.token)
      
      // 5. Проверяем обновление информации
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
            Authorization: `Bearer ${connectResponse.token}`,
          },
        }
      )
      
      console.log("   Update response:", updateResponse)
      
      // 6. Отправляем тестовое уведомление
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
            Authorization: `Bearer ${connectResponse.token}`,
          },
        }
      )
      
      console.log("   Notification response:", notificationResponse)
      
      // 7. Проверяем статус устройства в БД
      const updatedDevice = await db.device.findUnique({
        where: { id: device.id },
        include: {
          notifications: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      })
      
      console.log("\n📱 Device status after connection:")
      console.log("   Online:", updatedDevice?.isOnline)
      console.log("   Energy:", updatedDevice?.energy)
      console.log("   Last active:", updatedDevice?.lastActiveAt)
      console.log("   Notifications:", updatedDevice?.notifications.length)
      
      console.log("\n🎉 Device flow test completed successfully!")
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
testDeviceFlow()