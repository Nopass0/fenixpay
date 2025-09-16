import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function setupTestEnvironment() {
  try {
    console.log("🏗️ Setting up comprehensive test environment...\n")
    
    // 1. Найдем трейдера и создадим сессию
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
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
    
    let sessionToken = trader.sessions[0]?.token
    if (!sessionToken) {
      const session = await db.session.create({
        data: {
          token: `test-session-${Date.now()}`,
          userId: trader.id,
          ip: "127.0.0.1",
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })
      sessionToken = session.token
      console.log("🔑 Created test session")
    }
    
    console.log(`✅ Found trader: ${trader.email}`)
    
    // 2. Создаем устройство через API
    console.log("\n📱 Creating device...")
    const deviceResponse = await httpClient.post(
      "http://localhost:3000/api/trader/devices",
      {
        name: "Test Device for Notification Matching"
      },
      {
        headers: { "x-trader-token": sessionToken }
      }
    )
    
    console.log(`✅ Device created: ${deviceResponse.name}`)
    console.log(`   ID: ${deviceResponse.id}`)
    console.log(`   Token: ${deviceResponse.token.substring(0, 20)}...`)
    
    // 3. Создаем банковский реквизит и привязываем к устройству
    console.log("\n🏦 Creating bank detail...")
    const bankDetailResponse = await httpClient.post(
      "http://localhost:3000/api/trader/bank-details",
      {
        cardNumber: "4444555566667777",
        bankType: "SBER",
        methodType: "c2c",
        recipientName: "Тестович Тест",
        phoneNumber: "+79001234567",
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        intervalMinutes: 0,
        deviceId: deviceResponse.id
      },
      {
        headers: { "x-trader-token": sessionToken }
      }
    )
    
    console.log(`✅ Bank detail created and linked`)
    console.log(`   Recipient: ${bankDetailResponse.recipientName}`)
    console.log(`   Bank: ${bankDetailResponse.bankType}`)
    
    // 4. Создаем тестовые транзакции с разными суммами
    console.log("\n💰 Creating test transactions...")
    const testAmounts = [1000, 2500, 5000, 7500, 10000, 15000, 25000, 35000, 50000]
    const createdTransactions = []
    
    for (const amount of testAmounts) {
      try {
        const transaction = await db.transaction.create({
          data: {
            amount,
            currency: "RUB",
            status: "CREATED", // Активный статус для matching
            type: "IN",
            bankDetailId: bankDetailResponse.id,
            userId: trader.id,
            merchantTransactionId: `test-matching-${amount}-${Date.now()}`,
            description: `Test transaction for notification matching: ${amount} RUB`,
            metadata: {
              testTransaction: true,
              notificationMatching: true,
              expectedAmount: amount
            }
          }
        })
        
        createdTransactions.push(transaction)
        console.log(`   ✅ Transaction: ${amount} RUB (${transaction.id})`)
        
      } catch (error) {
        console.log(`   ⚠️  Failed to create transaction ${amount}: ${error}`)
      }
    }
    
    console.log(`✅ Created ${createdTransactions.length} test transactions`)
    
    // 5. Настраиваем Device Emulator Service
    console.log("\n🤖 Configuring Device Emulator Service...")
    const emulatorConfig = {
      global: {
        defaultPingSec: 20,
        defaultNotifyChance: 0.9,
        defaultSpamChance: 0.05,
        defaultDelayChance: 0.1,
        reconnectOnAuthError: true,
        rngSeed: Date.now()
      },
      devices: [
        {
          deviceCode: deviceResponse.token,
          bankType: "SBER",
          model: deviceResponse.name,
          androidVersion: "13",
          initialBattery: 85,
          pingSec: 20, // Каждые 20 секунд
          notifyChance: 0.95, // 95% шанс уведомления
          spamChance: 0.03, // 3% спам
          delayChance: 0.1,
          testAmounts: testAmounts // Используем созданные суммы
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
    console.log(`   Device: ${deviceResponse.token.substring(0, 20)}...`)
    console.log("   Frequency: every 20 seconds")
    console.log("   Notification rate: 95%")
    
    // 6. Тестируем подключение устройства
    console.log("\n🔌 Testing device connection...")
    try {
      const connectResponse = await httpClient.post("http://localhost:3000/api/device/connect", {
        deviceCode: deviceResponse.token,
        batteryLevel: 85,
        networkInfo: "Wi-Fi",
        deviceModel: deviceResponse.name,
        androidVersion: "13",
        appVersion: "2.0.0",
      })
      
      console.log("✅ Device connection successful")
      console.log(`   Auth token: ${connectResponse.token.substring(0, 20)}...`)
      
      // 7. Отправляем несколько тестовых уведомлений с точными суммами
      console.log("\n📬 Sending test notifications with matching amounts...")
      
      const testNotificationAmounts = [1000, 5000, 25000] // Используем суммы из созданных транзакций
      
      for (const amount of testNotificationAmounts) {
        try {
          await httpClient.post(
            "http://localhost:3000/api/device/notification",
            {
              packageName: "ru.sberbank.android",
              appName: "СберБанк Онлайн",
              title: "Пополнение",
              content: `Пополнение на ${amount.toLocaleString('ru-RU')} ₽ от Тест Т. Баланс: ${(amount * 5).toLocaleString('ru-RU')} ₽`,
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
          
          console.log(`   ✅ Test notification sent: ${amount} RUB`)
          
          // Небольшая задержка между уведомлениями
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (error: any) {
          console.log(`   ❌ Failed to send notification for ${amount}: ${error.message}`)
        }
      }
      
    } catch (error: any) {
      console.log(`❌ Device connection failed: ${error.message}`)
    }
    
    // 8. Проверяем созданные уведомления
    console.log("\n📬 Checking created notifications...")
    const notifications = await db.notification.findMany({
      where: {
        deviceId: deviceResponse.id,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Последние 5 минут
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    console.log(`✅ Found ${notifications.length} recent notifications`)
    notifications.forEach((notif, index) => {
      const content = notif.message?.substring(0, 50) || notif.title
      console.log(`   ${index + 1}. ${content}...`)
    })
    
    // 9. Финальная сводка
    console.log("\n🎉 Test Environment Setup Complete!")
    console.log("\n📊 Summary:")
    console.log(`   ✅ Device: ${deviceResponse.name}`)
    console.log(`   ✅ Bank Detail: ${bankDetailResponse.recipientName} (${bankDetailResponse.bankType})`)
    console.log(`   ✅ Test Transactions: ${createdTransactions.length} with amounts ${testAmounts.slice(0, 5)}...`)
    console.log(`   ✅ Device Emulator: Configured with 95% notification rate every 20s`)
    console.log(`   ✅ Test Notifications: Sent ${testNotificationAmounts.length} notifications`)
    
    console.log("\n🔬 Testing Goals:")
    console.log("   1. Device Emulator Service generates notifications frequently")
    console.log("   2. Notifications use real transaction amounts for high matching probability")
    console.log("   3. Notification matching service detects matches")
    console.log("   4. Matched transactions change status to indicate successful matching")
    
    console.log("\n📋 Monitoring:")
    console.log(`   - Device ID: ${deviceResponse.id}`)
    console.log(`   - Device Token: ${deviceResponse.token.substring(0, 20)}...`)
    console.log(`   - Bank Detail ID: ${bankDetailResponse.id}`)
    console.log("   - Check notifications table for new entries")
    console.log("   - Monitor transaction status changes")
    console.log("   - Watch for matching service logs")
    
    console.log("\n⚡ Expected Results:")
    console.log("   - Notifications every ~20 seconds")
    console.log("   - Many notifications with amounts from active transactions")
    console.log("   - High success rate in notification-transaction matching")
    console.log("   - Rapid status updates for matched transactions")
    
  } catch (error: any) {
    console.error("\n❌ Setup error:", error.message || error)
    if (error.response) {
      console.error("Response:", JSON.stringify(error.response, null, 2))
    }
  } finally {
    await db.$disconnect()
  }
}

setupTestEnvironment()