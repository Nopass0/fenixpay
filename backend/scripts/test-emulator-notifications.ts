import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function testEmulatorNotifications() {
  try {
    console.log("🧪 Testing Device Emulator Service notifications...\n")
    
    // 1. Проверяем конфигурацию эмулятора
    const emulatorConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    if (!emulatorConfig?.isEnabled) {
      console.log("❌ Device Emulator Service is not enabled")
      return
    }
    
    const config = emulatorConfig.config as any
    console.log("✅ Device Emulator Service is enabled")
    console.log(`   Configured devices: ${config.devices?.length || 0}`)
    
    if (!config.devices || config.devices.length === 0) {
      console.log("❌ No devices configured in emulator")
      return
    }
    
    const emulatedDevice = config.devices[0]
    console.log(`   Device code: ${emulatedDevice.deviceCode.substring(0, 16)}...`)
    console.log(`   Bank type: ${emulatedDevice.bankType}`)
    console.log(`   Notification chance: ${emulatedDevice.notifyChance * 100}%`)
    console.log(`   Ping interval: ${emulatedDevice.pingSec} seconds`)
    
    // 2. Проверяем, что устройство существует в БД
    const device = await db.device.findFirst({
      where: { token: emulatedDevice.deviceCode },
      include: {
        bankDetails: true,
        user: true
      }
    })
    
    if (!device) {
      console.log("❌ Device not found in database")
      return
    }
    
    console.log("\n✅ Device found in database:")
    console.log(`   Name: ${device.name}`)
    console.log(`   User: ${device.user.email}`)
    console.log(`   Online: ${device.isOnline}`)
    console.log(`   Bank details: ${device.bankDetails.length}`)
    
    // 3. Проверяем активные транзакции
    const activeTransactions = await db.transaction.findMany({
      where: {
        OR: [
          { bankDetailId: { in: device.bankDetails.map(bd => bd.id) } },
          { userId: device.userId }
        ],
        status: { in: ["CREATED", "IN_PROGRESS"] },
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    console.log(`\n💰 Active transactions for matching (${activeTransactions.length}):`)
    activeTransactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.amount} RUB (${tx.status}) - ${tx.createdAt.toISOString()}`)
    })
    
    // 4. Симулируем ручное подключение устройства (как это делает эмулятор)
    console.log("\n🔌 Testing manual device connection...")
    
    try {
      const connectResponse = await httpClient.post("http://localhost:3000/api/device/connect", {
        deviceCode: emulatedDevice.deviceCode,
        batteryLevel: 85,
        networkInfo: "Wi-Fi",
        deviceModel: emulatedDevice.model || "Emulated Device",
        androidVersion: emulatedDevice.androidVersion || "13",
        appVersion: "2.0.0",
      })
      
      console.log("✅ Device connection successful")
      console.log(`   Token: ${connectResponse.token.substring(0, 16)}...`)
      
      // 5. Отправляем тестовое уведомление с реальной суммой
      if (activeTransactions.length > 0) {
        console.log("\n📬 Sending test notification with real transaction amount...")
        
        const testAmount = activeTransactions[0].amount
        console.log(`   Using amount: ${testAmount} RUB`)
        
        const notificationResponse = await httpClient.post(
          "http://localhost:3000/api/device/notification",
          {
            packageName: "ru.sberbank.android",
            appName: "СберБанк Онлайн", 
            title: "Пополнение",
            content: `Пополнение на ${testAmount.toLocaleString('ru-RU')} ₽ от Тест Т. Баланс: ${(testAmount * 5).toLocaleString('ru-RU')} ₽`,
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
        
        console.log("✅ Test notification sent successfully")
        console.log("   This notification should match with an active transaction!")
        
        // Проверяем, создалось ли уведомление
        const notification = await db.notification.findFirst({
          where: {
            deviceId: device.id,
            message: { contains: testAmount.toString() }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        if (notification) {
          console.log("✅ Notification saved to database")
          console.log(`   ID: ${notification.id}`)
          console.log(`   Content: ${notification.message?.substring(0, 50)}...`)
        }
      }
      
      // 6. Проверяем статус устройства после подключения
      const updatedDevice = await db.device.findUnique({
        where: { id: device.id }
      })
      
      console.log("\n📱 Device status after connection:")
      console.log(`   Online: ${updatedDevice?.isOnline}`)
      console.log(`   Last active: ${updatedDevice?.lastActiveAt}`)
      console.log(`   Energy: ${updatedDevice?.energy}`)
      
    } catch (error: any) {
      console.log("❌ Device connection failed:", error.message)
    }
    
    // 7. Показываем инструкции для мониторинга
    console.log("\n📋 Monitoring Instructions:")
    console.log("   1. Device Emulator Service should now be sending notifications every ~20 seconds")
    console.log("   2. 90% of notifications should use real transaction amounts")
    console.log("   3. Check service logs for detailed operation info")
    console.log("   4. Monitor notification matching service for successful matches")
    
    console.log("\n🎯 Expected Results:")
    console.log("   - High frequency notifications (every 20-30 seconds)")
    console.log("   - Many notifications with amounts matching active deals")
    console.log("   - Successful transaction-notification matching")
    console.log("   - Reduced false positives in matching service")
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

testEmulatorNotifications()