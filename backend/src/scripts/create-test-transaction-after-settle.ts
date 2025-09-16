import { db } from "@/db"

async function createTestTransaction() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    // Get a payment method
    const method = await db.method.findFirst({
      where: {
        currency: "RUB",
        active: true
      }
    })
    
    if (!method) {
      console.error("No active payment method found")
      return
    }
    
    // Create a new transaction
    const transaction = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        methodId: method.id,
        type: "IN",
        amount: 10000,
        merchantRate: 79.5,
        status: "READY",
        createdAt: new Date() // This will be after the last settle
      }
    })
    
    console.log("Created transaction:")
    console.log("- ID:", transaction.id)
    console.log("- Amount:", transaction.amount, "RUB")
    console.log("- Merchant rate:", transaction.merchantRate)
    console.log("- Created at:", transaction.createdAt.toISOString())
    
    // Calculate USDT
    const commission = transaction.amount * (method.commissionPayin / 100)
    const netAmount = transaction.amount - commission
    const usdtAmount = netAmount / transaction.merchantRate
    const truncatedUsdt = Math.floor(usdtAmount * 100) / 100
    
    console.log("- Commission:", commission, "RUB")
    console.log("- Net amount:", netAmount, "RUB")
    console.log("- USDT amount:", truncatedUsdt, "USDT")
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

createTestTransaction()