import { db } from "@/db"

async function createTestSettleRequest() {
  try {
    // Find a merchant
    const merchant = await db.merchant.findFirst({
      where: {
        disabled: false
      }
    })

    if (!merchant) {
      console.error("No active merchant found")
      return
    }

    // Create a test settle request
    const settleRequest = await db.settleRequest.create({
      data: {
        merchantId: merchant.id,
        amount: 50000, // 50,000 RUB
        amountUsdt: 500, // 500 USDT (rate 100)
        rate: 100,
        status: "PENDING"
      }
    })

    console.log("Created test settle request:", settleRequest)
  } catch (error) {
    console.error("Error creating test settle request:", error)
  } finally {
    await db.$disconnect()
  }
}

createTestSettleRequest()