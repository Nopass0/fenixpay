import { PrismaClient, Status } from "@prisma/client"
import { randomBytes } from "crypto"

const db = new PrismaClient()

// Configuration for test data - using only valid BankType enum values from schema
const bankTypes = ["SBERBANK", "TBANK", "VTB", "ALFABANK", "RAIFFEISEN", "GAZPROMBANK", "OZONBANK", "MKB", "PROMSVYAZBANK", "POCHTABANK"]
const firstNames = ["Иван", "Петр", "Александр", "Михаил", "Андрей", "Сергей", "Дмитрий", "Алексей", "Владимир", "Николай", "Екатерина", "Мария", "Анна", "Ольга", "Татьяна"]
const lastNames = ["Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов", "Михайлов", "Федоров", "Новиков", "Морозов", "Волков", "Лебедев", "Семенов"]
const patronymics = ["Иванович", "Петрович", "Александрович", "Михайлович", "Андреевич", "Сергеевич", "Дмитриевич", "Алексеевич", "Владимирович", "Николаевич", "Павлович", "Артемович"]
const patronymicsFemale = ["Ивановна", "Петровна", "Александровна", "Михайловна", "Андреевна", "Сергеевна", "Дмитриевна", "Алексеевна", "Владимировна", "Николаевна"]

// Status distribution for 20 transactions
const statusDistribution: { status: Status; count: number; daysAgo?: number }[] = [
  { status: "CREATED", count: 3 },          // 3 новых транзакций
  { status: "IN_PROGRESS", count: 2 },      // 2 в процессе
  { status: "READY", count: 10 },           // 10 успешных
  { status: "EXPIRED", count: 2, daysAgo: 1 }, // 2 истекших
  { status: "CANCELED", count: 2, daysAgo: 2 }, // 2 отмененных
  { status: "DISPUTE", count: 1, daysAgo: 1 }   // 1 спорная
]

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function generateClientName(): string {
  const isFemale = Math.random() > 0.7
  const firstName = getRandomElement(firstNames)
  const lastName = getRandomElement(lastNames)
  const patronymic = isFemale ? getRandomElement(patronymicsFemale) : getRandomElement(patronymics)
  
  // Add gender suffix to last name if female
  const genderLastName = isFemale && !lastName.endsWith("а") ? lastName + "а" : lastName
  
  return `${genderLastName} ${firstName} ${patronymic}`
}

function generateCardNumber(): string {
  // Generate realistic card numbers for different banks
  const prefixes = ["4276", "5469", "2200", "4278", "5211", "4279", "5536", "2202", "4155", "5189"]
  const prefix = getRandomElement(prefixes)
  const middle = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  const last = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `${prefix}${middle}${last}`
}

function generateAmount(): number {
  // Generate various amounts between 1000 and 150000
  const ranges = [
    { min: 1000, max: 5000 },    // Small amounts
    { min: 5000, max: 15000 },   // Medium amounts
    { min: 15000, max: 50000 },  // Large amounts
    { min: 50000, max: 150000 }  // Very large amounts
  ]
  const range = getRandomElement(ranges)
  return Math.round((Math.random() * (range.max - range.min) + range.min) / 100) * 100
}

function generatePhoneNumber(): string {
  const codes = ["903", "905", "906", "909", "910", "915", "916", "917", "918", "919", "920", "925", "926", "927", "928", "929", "930", "933", "936", "939"]
  const code = getRandomElement(codes)
  const number1 = Math.floor(Math.random() * 1000).toString().padStart(3, "0")
  const number2 = Math.floor(Math.random() * 100).toString().padStart(2, "0")
  const number3 = Math.floor(Math.random() * 100).toString().padStart(2, "0")
  return `+7${code}${number1}${number2}${number3}`
}

async function createTestTransactions() {
  try {
    console.log("🚀 Starting to generate 20 test transactions...")

    // Find trader user
    const trader = await db.user.findFirst({
      where: { 
        email: { contains: "trader" }
      }
    })

    if (!trader) {
      console.error("❌ No trader user found. Please create a trader user first.")
      return
    }

    console.log(`✅ Found trader: ${trader.email} (${trader.name})`)

    // Find or create merchant
    let merchant = await db.merchant.findFirst({
      where: { name: "Test Merchant" }
    })

    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          name: "Test Merchant",
          token: randomBytes(32).toString("hex"),
          balanceUsdt: 100000
        }
      })
      console.log("✅ Created test merchant")
    }

    // Find or create method
    let method = await db.method.findFirst({
      where: { code: "c2c" }
    })

    if (!method) {
      method = await db.method.create({
        data: {
          code: "c2c",
          name: "Card to Card",
          type: "c2c",
          currency: "rub",
          commissionPayin: 1.5,
          commissionPayout: 1.0,
          maxPayin: 500000,
          minPayin: 100,
          maxPayout: 500000,
          minPayout: 100,
          chancePayin: 100,
          chancePayout: 100,
          isEnabled: true
        }
      })
      console.log("✅ Created c2c method")
    }

    // Find or create device for trader
    let device = await db.device.findFirst({
      where: { userId: trader.id }
    })

    if (!device) {
      device = await db.device.create({
        data: {
          name: "Test Device",
          userId: trader.id,
          isOnline: true,
          token: randomBytes(32).toString("hex"),
          emulated: true
        }
      })
      console.log("✅ Created test device")
    }

    // Create transactions based on distribution
    let transactionCount = 0
    const currentRate = 95.5 // Current USDT/RUB rate

    for (const config of statusDistribution) {
      for (let i = 0; i < config.count; i++) {
        const amount = generateAmount()
        const clientName = generateClientName()
        const bankType = getRandomElement(bankTypes)
        const cardNumber = generateCardNumber()
        const phoneNumber = generatePhoneNumber()
        
        // Calculate dates based on status
        const now = new Date()
        const createdAt = config.daysAgo 
          ? new Date(now.getTime() - config.daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 12 * 60 * 60 * 1000)
          : new Date(now.getTime() - Math.random() * 2 * 60 * 60 * 1000) // Within last 2 hours
        
        const expiredAt = new Date(createdAt.getTime() + 30 * 60 * 1000) // 30 minutes after creation
        const acceptedAt = (config.status === "IN_PROGRESS" || config.status === "READY" || config.status === "DISPUTE") 
          ? new Date(createdAt.getTime() + Math.random() * 5 * 60 * 1000) // 0-5 minutes after creation
          : null

        // Create bank detail (requisite) for trader
        const requisite = await db.bankDetail.create({
          data: {
            userId: trader.id,
            methodType: method.type,
            bankType: bankType as any,
            cardNumber: cardNumber,
            recipientName: clientName,
            phoneNumber: phoneNumber,
            minAmount: 100,
            maxAmount: 500000,
            dailyLimit: 1000000,
            monthlyLimit: 10000000,
            deviceId: device.id,
            isArchived: false
          }
        })

        // Calculate commission and rate
        const rate = currentRate + (Math.random() * 2 - 1) // ±1 RUB variation
        const usdtAmount = amount / rate
        const commission = usdtAmount * (method.commissionPayin / 100)
        const frozenAmount = (config.status === "IN_PROGRESS" || config.status === "READY" || config.status === "DISPUTE") 
          ? usdtAmount 
          : null

        // Create transaction
        const transaction = await db.transaction.create({
          data: {
            merchantId: merchant.id,
            methodId: method.id,
            amount: amount,
            currency: "RUB",
            assetOrBank: bankType,
            orderId: `order-${Date.now()}-${i}`,
            userId: `user-${randomBytes(8).toString("hex")}`,
            userIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
            callbackUri: "https://merchant.example.com/callback",
            successUri: "https://merchant.example.com/success",
            failUri: "https://merchant.example.com/fail",
            type: "IN",
            expired_at: expiredAt,
            commission: commission,
            clientName: clientName,
            status: config.status,
            rate: rate,
            traderId: trader.id,
            bankDetailId: requisite.id,
            createdAt: createdAt,
            acceptedAt: acceptedAt,
            calculatedCommission: commission,
            frozenUsdtAmount: frozenAmount,
            feeInPercent: method.commissionPayin,
            adjustedRate: rate
          }
        })

        transactionCount++
        console.log(`✅ Created transaction #${transaction.numericId} - ${config.status} - ${amount} RUB (${clientName})`)

        // Add receipts for completed transactions
        if (config.status === "READY" && Math.random() > 0.3) {
          await db.receipt.create({
            data: {
              transactionId: transaction.id,
              fileName: `receipt-${transaction.numericId}.jpg`,
              fileData: "base64-encoded-image-data",
              isChecked: true,
              isFake: false,
              isAuto: true
            }
          })
        }
      }
    }

    console.log(`\n🎉 Successfully created ${transactionCount} test transactions!`)
    console.log("\nStatus distribution:")
    console.log("- CREATED (Ожидает): 3")
    console.log("- IN_PROGRESS (В работе): 2")
    console.log("- READY (Выполнено): 10")
    console.log("- EXPIRED (Истекло): 2")
    console.log("- CANCELED (Отменено): 2")
    console.log("- DISPUTE (Спор): 1")

  } catch (error) {
    console.error("❌ Error creating test transactions:", error)
  } finally {
    await db.$disconnect()
  }
}

// Run the script
createTestTransactions().catch(console.error)