import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function diagnoseDeviceIssue() {
  try {
    console.log("🔬 Diagnosing device visibility issue...\n")
    
    // 1. Проверяем всех трейдеров и их устройства
    const allTraders = await db.user.findMany({
      include: {
        devices: true,
        bankDetails: true
      }
    })
    
    console.log(`👥 Found ${allTraders.length} total users:`)
    allTraders.forEach(trader => {
      console.log(`   ${trader.email}: ${trader.devices.length} devices, ${trader.bankDetails.length} bank details`)
    })
    
    // 2. Проверяем конкретного трейдера
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
      console.log("❌ trader@example.com not found")
      return
    }
    
    console.log(`\n🎯 Focusing on trader@example.com:`)
    console.log(`   Devices in DB: ${trader.devices.length}`)
    console.log(`   Bank Details in DB: ${trader.bankDetails.length}`)
    console.log(`   Active Sessions: ${trader.sessions.length}`)
    
    if (trader.devices.length === 0) {
      console.log("   No devices found in DB - this explains why frontend shows empty list")
      return
    }
    
    // 3. Пытаемся использовать существующую сессию или создаем новую
    let sessionToken = trader.sessions[0]?.token
    
    if (!sessionToken) {
      console.log("   Creating new session...")
      const newSession = await db.session.create({
        data: {
          token: `diagnose-${Date.now()}`,
          userId: trader.id,
          ip: "127.0.0.1",
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })
      sessionToken = newSession.token
    }
    
    console.log(`   Using session: ${sessionToken.substring(0, 20)}...`)
    
    // 4. Тестируем все возможные API endpoints
    const apiTests = [
      {
        name: "GET /trader/devices",
        test: async () => await httpClient.get(
          "http://localhost:3000/api/trader/devices",
          { headers: { "x-trader-token": sessionToken } }
        )
      },
      {
        name: "GET /trader/bank-details",
        test: async () => await httpClient.get(
          "http://localhost:3000/api/trader/bank-details",
          { headers: { "x-trader-token": sessionToken } }
        )
      }
    ]
    
    // Добавляем тесты для каждого устройства
    trader.devices.forEach(device => {
      apiTests.push({
        name: `GET /trader/devices/${device.id}`,
        test: async () => await httpClient.get(
          `http://localhost:3000/api/trader/devices/${device.id}`,
          { headers: { "x-trader-token": sessionToken } }
        )
      })
    })
    
    console.log(`\n🧪 Running ${apiTests.length} API tests:`)
    
    for (const apiTest of apiTests) {
      try {
        const result = await apiTest.test()
        
        if (apiTest.name.includes("/devices") && !apiTest.name.includes("/bank-details")) {
          const count = Array.isArray(result) ? result.length : 1
          console.log(`   ✅ ${apiTest.name}: ${count} items`)
        } else {
          console.log(`   ✅ ${apiTest.name}: OK`)
        }
        
      } catch (error: any) {
        console.log(`   ❌ ${apiTest.name}: ${error.message}`)
        if (error.response) {
          console.log(`      Response: ${JSON.stringify(error.response).substring(0, 100)}...`)
        }
      }
    }
    
    // 5. Проверяем Device Emulator Service
    console.log(`\n🤖 Device Emulator Service status:`)
    const emulatorConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    console.log(`   Enabled: ${emulatorConfig?.isEnabled}`)
    if (emulatorConfig?.config) {
      const config = emulatorConfig.config as any
      console.log(`   Configured devices: ${config.devices?.length || 0}`)
      
      // Проверяем, нет ли конфликтов токенов
      const emulatedTokens = config.devices?.map((d: any) => d.deviceCode) || []
      const traderTokens = trader.devices.map(d => d.token)
      
      const conflicts = emulatedTokens.filter((token: string) => traderTokens.includes(token))
      if (conflicts.length > 0) {
        console.log(`   ⚠️  Token conflicts found: ${conflicts.length}`)
        conflicts.forEach((token: string) => {
          console.log(`      Conflict: ${token.substring(0, 16)}...`)
        })
      } else {
        console.log(`   ✅ No token conflicts`)
      }
    }
    
    // 6. Финальная диагностика
    console.log(`\n📋 Diagnostic Summary:`)
    console.log(`   Database has devices: ${trader.devices.length > 0 ? 'YES' : 'NO'}`)
    console.log(`   API returns devices: Run tests above to see`)
    console.log(`   Emulator service enabled: ${emulatorConfig?.isEnabled ? 'YES' : 'NO'}`)
    console.log(`   Token conflicts: Check above`)
    
    if (trader.devices.length > 0) {
      console.log(`\n💡 If frontend shows no devices despite API working:`)
      console.log(`   1. Check browser cache/localStorage`)
      console.log(`   2. Check frontend error console`)
      console.log(`   3. Verify session token on frontend`)
      console.log(`   4. Check for JavaScript errors during API calls`)
    }
    
  } catch (error: any) {
    console.error("\n❌ Diagnostic error:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

diagnoseDeviceIssue()