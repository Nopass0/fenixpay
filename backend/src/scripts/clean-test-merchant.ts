import { db } from "@/db"

async function cleanTestMerchant() {
  try {
    // Find test merchant
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    console.log("Found test merchant:", merchant.id, merchant.name)
    
    // Delete all transactions
    const deletedTransactions = await db.transaction.deleteMany({
      where: { merchantId: merchant.id }
    })
    console.log("Deleted transactions:", deletedTransactions.count)
    
    // Delete all transaction attempts
    const deletedAttempts = await db.transactionAttempt.deleteMany({
      where: { merchantId: merchant.id }
    })
    console.log("Deleted transaction attempts:", deletedAttempts.count)
    
    // Delete all settle requests
    const deletedSettleRequests = await db.settleRequest.deleteMany({
      where: { merchantId: merchant.id }
    })
    console.log("Deleted settle requests:", deletedSettleRequests.count)
    
    // Delete all payouts
    const deletedPayouts = await db.payout.deleteMany({
      where: { merchantId: merchant.id }
    })
    console.log("Deleted payouts:", deletedPayouts.count)
    
    // Delete all merchant settlements
    const deletedSettlements = await db.merchantSettlement.deleteMany({
      where: { merchantId: merchant.id }
    })
    console.log("Deleted merchant settlements:", deletedSettlements.count)
    
    console.log("\nAll data cleaned for test merchant")
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

cleanTestMerchant()