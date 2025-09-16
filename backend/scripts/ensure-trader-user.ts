import { db } from "../src/db"

async function ensureTraderUser() {
  try {
    // Проверка существования trader пользователя
    let trader = await db.user.findFirst({
      where: { 
        email: "trader@example.com"
      }
    })
    
    if (!trader) {
      console.log("📝 Creating trader user...")
      trader = await db.user.create({
        data: {
          email: "trader@example.com",
          password: "$2a$10$K7L7K8yvUqF8b8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J8", // placeholder
          name: "Default Trader",
          balanceUsdt: 0,
          balanceRub: 0,
          trafficEnabled: true,
          profitPercent: 0,
          stakePercent: 0
        }
      })
      console.log("✅ Trader user created:", trader.id)
    } else {
      console.log("✅ Trader user already exists:", trader.id)
    }
    
    // Проверка банковских деталей
    const bankDetails = await db.bankDetail.findMany({
      where: { 
        userId: trader.id,
        isArchived: false
      }
    })
    
    console.log(`\n📊 Found ${bankDetails.length} active bank details for trader`)
    
    if (bankDetails.length === 0) {
      console.log("📝 Creating default bank detail...")
      const bankDetail = await db.bankDetail.create({
        data: {
          userId: trader.id,
          methodType: "c2c",
          bankType: "SBERBANK",
          cardNumber: "4444555566667777",
          recipientName: "Default Trader",
          phoneNumber: "+79001234567",
          minAmount: 100,
          maxAmount: 50000,
          dailyLimit: 500000,
          monthlyLimit: 5000000,
          intervalMinutes: 0,
          isArchived: false
        }
      })
      console.log("✅ Bank detail created:", bankDetail.id)
    }
    
    // Проверка конфигурации эмулятора
    const emulatorConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    if (emulatorConfig) {
      console.log("\n🤖 Device Emulator Service config found")
      console.log("   Enabled:", emulatorConfig.isEnabled)
      
      const config = emulatorConfig.config as any
      if (config?.devices) {
        console.log(`   Devices configured: ${config.devices.length}`)
        config.devices.forEach((device: any, index: number) => {
          console.log(`   Device ${index + 1}:`)
          console.log(`     - Code: ${device.deviceCode}`)
          console.log(`     - Bank: ${device.bankType}`)
          console.log(`     - Model: ${device.model}`)
        })
      }
    } else {
      console.log("\n⚠️  No Device Emulator Service config found")
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

ensureTraderUser()