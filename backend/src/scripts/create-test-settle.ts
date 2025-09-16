import { db } from "@/db"
import { RapiraService } from "@/services/rapira.service"

async function createTestSettle() {
  try {
    // Find merchant
    const merchant = await db.merchant.findFirst({
      where: { id: "cmdhsl7mm01koikbmm02684xd" }
    })
    
    if (!merchant) {
      console.error("Merchant not found")
      return
    }
    
    console.log("Found merchant:", merchant.name)
    
    // Check if there's already a pending request
    const pendingRequest = await db.settleRequest.findFirst({
      where: {
        merchantId: merchant.id,
        status: "PENDING"
      }
    })
    
    if (pendingRequest) {
      console.log("Already has pending request:", pendingRequest.id)
      return
    }
    
    // Create a new settle request
    const settleRequest = await db.settleRequest.create({
      data: {
        merchantId: merchant.id,
        amount: 9376.2,
        amountUsdt: 100,
        rate: 93.762
      }
    })
    
    console.log("Created settle request:", settleRequest)
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

createTestSettle()