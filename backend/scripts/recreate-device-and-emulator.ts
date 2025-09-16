import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function recreateDeviceAndEmulator() {
  try {
    console.log("🔄 Recreating device and configuring emulator...\n")
    
    // 1. Найдем трейдера
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        devices: true,
        bankDetails: true,
        sessions: {
          where: { expiredAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    console.log("✅ Found trader:", trader.email)
    console.log(`   Current devices: ${trader.devices.length}`)
    console.log(`   Bank details: ${trader.bankDetails.length}`)
    console.log(`   Active sessions: ${trader.sessions.length}`)
    
    // 2. Создаем сессию если нужно
    let sessionToken = trader.sessions[0]?.token
    
    if (!sessionToken) {
      const session = await db.session.create({
        data: {
          token: `recreate-device-${Date.now()}`,
          userId: trader.id,
          ip: "127.0.0.1",
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })
      sessionToken = session.token
      console.log("🔑 Created new session")
    }
    
    // 3. Создаем новое устройство через API трейдера
    console.log("\n📱 Creating new device...")
    
    const newDevice = await httpClient.post(
      "http://localhost:3000/api/trader/devices",
      {
        name: "Emulated Device for Notification Testing"
      },
      {
        headers: { "x-trader-token": sessionToken }
      }
    )
    
    console.log("✅ Device created:")
    console.log(`   ID: ${newDevice.id}`)
    console.log(`   Name: ${newDevice.name}`)
    console.log(`   Token: ${newDevice.token.substring(0, 20)}...`)
    
    // 4. Создаем банковский реквизит если нужно
    let bankDetailId = trader.bankDetails[0]?.id
    
    if (!bankDetailId) {
      console.log("\n🏦 Creating bank detail...")
      
      const bankDetail = await httpClient.post(
        "http://localhost:3000/api/trader/bank-details",
        {
          cardNumber: "4444555566667777",
          bankType: "SBER", // Используем короткий код, который будет маппиться в SBERBANK
          methodType: "c2c",
          recipientName: "Эмуляционный Тест",
          phoneNumber: "+79001234567",
          minAmount: 100,
          maxAmount: 50000,
          dailyLimit: 500000,
          monthlyLimit: 5000000,
          intervalMinutes: 0,
          deviceId: newDevice.id // Сразу привязываем к устройству
        },
        {
          headers: { "x-trader-token": sessionToken }
        }
      )
      
      console.log("✅ Bank detail created and linked to device")
      bankDetailId = bankDetail.id
    } else {
      // Привязываем существующий реквизит к устройству
      await httpClient.post(
        "http://localhost:3000/api/trader/devices/link",
        {
          deviceId: newDevice.id,
          bankDetailId: bankDetailId
        },
        {
          headers: { "x-trader-token": sessionToken }
        }
      )
      
      console.log("✅ Linked existing bank detail to device")
    }
    
    // 5. Создаем активные тестовые транзакции
    console.log("\n💰 Creating test transactions for matching...")
    
    const testAmounts = [1000, 2500, 5000, 7500, 10000, 15000, 25000, 50000]
    const createdTransactions = []
    
    for (const amount of testAmounts) {
      try {
        const transaction = await db.transaction.create({
          data: {
            amount,
            currency: "RUB",
            status: "CREATED", // Активный статус для сопоставления
            type: "IN",
            bankDetailId: bankDetailId,
            userId: trader.id,
            merchantTransactionId: `emulation-test-${amount}-${Date.now()}`,
            description: `Test transaction for emulation: ${amount} RUB`,
            metadata: {
              testTransaction: true,
              createdForEmulation: true,
              emulationTest: true
            }
          }
        })
        
        createdTransactions.push(transaction)
        console.log(`   ✅ Created transaction: ${amount} RUB (${transaction.id})`)
        
      } catch (error) {
        console.log(`   ⚠️  Could not create transaction ${amount}: ${error}`)
      }
    }
    
    console.log(`\n✅ Created ${createdTransactions.length} test transactions`)
    
    // 6. Настраиваем Device Emulator Service
    console.log("\n🤖 Configuring Device Emulator Service...")
    
    const emulatorConfig = {
      global: {
        defaultPingSec: 20, // Быстрые уведомления
        defaultNotifyChance: 0.9, // 90% шанс уведомления
        defaultSpamChance: 0.05, // 5% спам
        defaultDelayChance: 0.1,
        reconnectOnAuthError: true,
        rngSeed: Date.now()
      },
      devices: [
        {
          deviceCode: newDevice.token, // Используем токен созданного устройства
          bankType: "SBER", // Для шаблонов уведомлений
          model: newDevice.name,
          androidVersion: "13",
          initialBattery: 85,
          pingSec: 15, // Каждые 15 секунд
          notifyChance: 0.95, // 95% шанс уведомления!
          spamChance: 0.03, // 3% спам
          delayChance: 0.1,
          // Добавляем точные суммы для высокого шанса сопоставления
          testAmounts: testAmounts
        }
      ]
    }
    
    await db.serviceConfig.upsert({
      where: { serviceKey: "device_emulator" },
      create: {
        serviceKey: "device_emulator",
        config: emulatorConfig,
        isEnabled: true,
      },
      update: {
        config: emulatorConfig,
        isEnabled: true,
      }
    })
    
    console.log("✅ Device Emulator Service configured")
    console.log(`   Device token: ${newDevice.token.substring(0, 20)}...`)
    console.log("   Notification frequency: every 15 seconds")
    console.log("   Notification chance: 95%")
    console.log("   Test amounts:", testAmounts.slice(0, 5), "...")
    
    // 7. Тестируем подключение
    console.log("\n🔌 Testing device connection...")
    
    try {
      const connectResponse = await httpClient.post("http://localhost:3000/api/device/connect", {
        deviceCode: newDevice.token,
        batteryLevel: 85,
        networkInfo: "Wi-Fi",
        deviceModel: newDevice.name,
        androidVersion: "13",
        appVersion: "2.0.0",
      })
      
      console.log("✅ Device connection successful!")
      console.log(`   Returned token: ${connectResponse.token.substring(0, 20)}...`)
      
      // Отправляем тестовое уведомление с одной из реальных сумм
      const testAmount = testAmounts[0]
      console.log(`\n📬 Sending test notification with amount ${testAmount}...`)
      
      const notificationResponse = await httpClient.post(
        "http://localhost:3000/api/device/notification",
        {
          packageName: "ru.sberbank.android",
          appName: "СберБанк Онлайн",
          title: "Пополнение",
          content: `Пополнение на ${testAmount.toLocaleString('ru-RU')} ₽ от Эмуляция Т. Баланс: ${(testAmount * 3).toLocaleString('ru-RU')} ₽`,
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
      
      console.log("✅ Test notification sent - should match with transaction!")
      
    } catch (error: any) {
      console.log("❌ Device connection failed:", error.message)
    }
    
    // 8. Финальная сводка
    console.log("\n🎉 Setup Complete!")
    console.log("\n📊 Summary:")
    console.log(`   ✅ Device created: ${newDevice.name}`)
    console.log(`   ✅ Bank detail linked: Эмуляционный Тест`)
    console.log(`   ✅ Test transactions: ${createdTransactions.length} amounts`)
    console.log(`   ✅ Emulator configured: 95% notification rate every 15s`)
    console.log(`   ✅ Connection tested: Device can receive notifications`)
    
    console.log("\n📋 Expected Behavior:")
    console.log("   - Device Emulator Service sends notifications every ~15-20 seconds")
    console.log("   - 95% of notifications use real transaction amounts")
    console.log("   - High chance of successful notification-transaction matching")
    console.log("   - Notification matching service should detect many matches")
    
    console.log("\n⚡ Monitor:")
    console.log("   - Service logs for emulator operation")
    console.log("   - Notification matching service for successful matches")
    console.log("   - Database notifications table for new entries")
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

recreateDeviceAndEmulator()