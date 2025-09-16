import { PrismaClient } from "@prisma/client"
import { randomBytes } from "crypto"

const db = new PrismaClient()

const bankNames = ["СберБанк", "Тинькофф", "ВТБ", "Альфа-Банк", "Райффайзен"]
const firstNames = ["Иван", "Петр", "Александр", "Михаил", "Андрей", "Сергей", "Дмитрий", "Алексей", "Владимир", "Николай"]
const lastNames = ["Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов", "Михайлов", "Федоров"]
const patronymics = ["Иванович", "Петрович", "Александрович", "Михайлович", "Андреевич", "Сергеевич", "Дмитриевич", "Алексеевич"]

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function generateClientName(): string {
  const firstName = getRandomElement(firstNames)
  const lastName = getRandomElement(lastNames)
  const patronymic = getRandomElement(patronymics)
  return `${lastName} ${firstName} ${patronymic}`
}

function generateAmount(): number {
  // Generate amounts between 5000 and 50000, rounded to 100
  return Math.round((Math.random() * 45000 + 5000) / 100) * 100
}

async function setupTraderEnvironment() {
  try {
    // First, find or create a test trader
    let trader = await db.user.findFirst({
      where: { email: "test@trader.com" }
    })
    
    if (!trader) {
      trader = await db.user.create({
        data: {
          id: "test-trader-" + randomBytes(8).toString("hex"),
          email: "test@trader.com",
          name: "Test Trader",
          password: "password123", // In real app this would be hashed
          balanceUsdt: 1000,
          balanceRub: 0,
          trafficEnabled: true
        }
      })
      console.log("Created test trader:", trader.email)
    } else {
      // Update balance to 1000 USDT
      await db.user.update({
        where: { id: trader.id },
        data: { balanceUsdt: 1000 }
      })
      console.log("Updated trader balance to 1000 USDT")
    }
    
    return { trader }
  } catch (error) {
    console.error("Error setting up trader environment:", error)
    throw error
  }
}

async function generateSingleTransaction(traderId: string) {
  try {
    // First find or create a test merchant
    let merchant = await db.merchant.findFirst({
      where: { name: "Test Merchant" }
    })
    
    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          id: "test-merchant-" + randomBytes(8).toString("hex"),
          name: "Test Merchant",
          token: randomBytes(16).toString("hex"),
          disabled: false,
          banned: false,
          balanceUsdt: 10000
        }
      })
    }
    
    // Find or create a test method
    let method = await db.method.findFirst({
      where: { name: "Card" }
    })
    
    if (!method) {
      method = await db.method.create({
        data: {
          id: "method-" + randomBytes(8).toString("hex"),
          code: "CARD",
          name: "Card",
          type: "c2c",
          currency: "RUB",
          commissionPayin: 2.5,
          commissionPayout: 1.5,
          maxPayin: 500000,
          minPayin: 100,
          maxPayout: 500000,
          minPayout: 100,
          chancePayin: 100,
          chancePayout: 100,
          isEnabled: true,
          rateSource: "AUTO"
        }
      })
    }
    
    const transaction = await db.transaction.create({
      data: {
        id: "txn-" + randomBytes(16).toString("hex"),
        numericId: Math.floor(Math.random() * 1000000),
        userId: traderId,
        traderId: traderId,
        merchantId: merchant.id,
        methodId: method.id,
        amount: generateAmount(),
        currency: "RUB",
        type: "IN",
        status: "CREATED",
        clientName: generateClientName(),
        assetOrBank: getRandomElement(bankNames),
        orderId: "order-" + randomBytes(8).toString("hex"),
        callbackUri: "https://example.com/callback",
        successUri: "https://example.com/success",
        failUri: "https://example.com/fail",
        commission: 0,
        expired_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        isMock: false
      }
    })
    
    console.log(`Generated transaction #${transaction.numericId} - ${transaction.amount} RUB`)
    return transaction
  } catch (error) {
    console.error("Error generating transaction:", error)
  }
}

let isRunning = true

async function startTransactionGenerator() {
  console.log("Setting up trader environment...")
  const { trader } = await setupTraderEnvironment()
  
  console.log("Starting transaction generator...")
  console.log("Press Ctrl+C to stop")
  
  // Generate transactions periodically
  const generateNext = async () => {
    if (!isRunning) return
    
    await generateSingleTransaction(trader.id)
    
    // Schedule next transaction in 3-10 seconds
    const nextDelay = Math.floor(Math.random() * 7000) + 3000
    setTimeout(generateNext, nextDelay)
  }
  
  // Start the generation
  generateNext()
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nStopping transaction generator...")
  isRunning = false
  setTimeout(() => {
    db.$disconnect()
    process.exit(0)
  }, 1000)
})

// Start the generator
startTransactionGenerator().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})