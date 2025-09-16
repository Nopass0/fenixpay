import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function testAllBankTypes() {
  try {
    console.log("🧪 Testing all bank type mappings...\n")
    
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    // Создаем сессию
    const traderSession = await db.session.create({
      data: {
        token: `test-all-banks-${Date.now()}`,
        userId: trader.id,
        ip: "127.0.0.1",
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })
    
    // Тестируемые типы банков
    const bankTypesToTest = [
      { frontend: "SBER", expected: "SBERBANK" },
      { frontend: "TINK", expected: "TINKOFF" },
      { frontend: "VTB", expected: "VTB" },
      { frontend: "ALFA", expected: "ALFABANK" },
      { frontend: "GAZPROM", expected: "GAZPROMBANK" },
      { frontend: "OZON", expected: "OZONBANK" },
      { frontend: "SBERBANK", expected: "SBERBANK" }, // Прямое соответствие
    ]
    
    for (let i = 0; i < bankTypesToTest.length; i++) {
      const { frontend, expected } = bankTypesToTest[i]
      
      console.log(`\n${i + 1}. Testing ${frontend} → ${expected}`)
      
      try {
        // Создаем устройство для каждого теста
        const device = await httpClient.post(
          "http://localhost:3000/api/trader/devices", 
          { name: `Test Device ${i + 1}` },
          { headers: { "x-trader-token": traderSession.token } }
        )
        
        // Создаем банковский реквизит
        const bankDetail = await httpClient.post(
          "http://localhost:3000/api/trader/bank-details",
          {
            cardNumber: `111111111111111${i}`,
            bankType: frontend,
            methodType: "c2c",
            recipientName: `Test User ${i + 1}`,
            phoneNumber: `+7999999999${i}`,
            minAmount: 100,
            maxAmount: 50000,
            dailyLimit: 500000,
            monthlyLimit: 5000000,
            intervalMinutes: 0,
            deviceId: device.id
          },
          { headers: { "x-trader-token": traderSession.token } }
        )
        
        if (bankDetail.bankType === expected) {
          console.log(`   ✅ ${frontend} correctly mapped to ${expected}`)
        } else {
          console.log(`   ❌ ${frontend} mapped to ${bankDetail.bankType}, expected ${expected}`)
        }
        
      } catch (error: any) {
        console.log(`   ❌ Error testing ${frontend}:`, error.message)
      }
    }
    
    console.log("\n🎉 Bank type mapping test completed!")
    
  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

testAllBankTypes()