import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function testBankDetailCreation() {
  try {
    console.log("🧪 Testing bank detail creation with SBER type...\n")
    
    // Получаем трейдера
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    console.log("✅ Found trader:", trader.email)
    
    // Создаем сессию для трейдера
    const traderSession = await db.session.create({
      data: {
        token: `test-bank-session-${Date.now()}`,
        userId: trader.id,
        ip: "127.0.0.1",
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })
    
    console.log("🔑 Created trader session:", traderSession.token)
    
    // Сначала создадим устройство
    console.log("\n📱 Creating device first...")
    const createDeviceResponse = await httpClient.post(
      "http://localhost:3000/api/trader/devices", 
      {
        name: "Test Device for Bank Detail"
      },
      {
        headers: {
          "x-trader-token": traderSession.token
        }
      }
    )
    
    console.log("✅ Device created:", createDeviceResponse.id)
    
    // Тестируем создание банковского реквизита с типом SBER
    console.log("\n🏦 Creating bank detail with SBER type...")
    
    const createBankDetailResponse = await httpClient.post(
      "http://localhost:3000/api/trader/bank-details",
      {
        cardNumber: "1111111111111111",
        bankType: "SBER", // Фронтенд отправляет SBER
        methodType: "c2c",
        recipientName: "Тестович Тест",
        phoneNumber: "+79999999999",
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        intervalMinutes: 0,
        deviceId: createDeviceResponse.id
      },
      {
        headers: {
          "x-trader-token": traderSession.token
        }
      }
    )
    
    console.log("📡 Bank detail creation response:", JSON.stringify(createBankDetailResponse, null, 2))
    
    if (createBankDetailResponse.id) {
      console.log("\n✅ Bank detail created successfully!")
      console.log("   ID:", createBankDetailResponse.id)
      console.log("   Bank Type:", createBankDetailResponse.bankType)
      console.log("   Card Number:", createBankDetailResponse.cardNumber)
      
      // Проверим в базе данных
      const bankDetailInDb = await db.bankDetail.findUnique({
        where: { id: createBankDetailResponse.id }
      })
      
      console.log("\n🔍 Checking in database:")
      console.log("   Bank Type in DB:", bankDetailInDb?.bankType)
      console.log("   Should be: SBERBANK")
      
      if (bankDetailInDb?.bankType === "SBERBANK") {
        console.log("✅ Bank type mapping works correctly!")
      } else {
        console.log("❌ Bank type mapping failed!")
      }
      
    } else {
      console.log("\n❌ Failed to create bank detail")
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
testBankDetailCreation()