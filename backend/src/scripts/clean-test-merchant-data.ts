import { db } from "@/db"

async function cleanTestMerchantData() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    console.log("Found test merchant:", merchant.id)
    
    // Delete settle requests
    const deletedSettles = await db.settleRequest.deleteMany({
      where: { merchantId: merchant.id }
    })
    console.log("Deleted settle requests:", deletedSettles.count)
    
    // Delete transactions
    const deletedTransactions = await db.transaction.deleteMany({
      where: { merchantId: merchant.id }
    })
    console.log("Deleted transactions:", deletedTransactions.count)
    
    // Also delete payouts if any
    const deletedPayouts = await db.payout.deleteMany({
      where: { merchantId: merchant.id }
    })
    console.log("Deleted payouts:", deletedPayouts.count)
    
    console.log("\nCleanup completed successfully!")
    
  } catch (error) {
    console.error("Error during cleanup:", error)
  } finally {
    await db.$disconnect()
  }
}

cleanTestMerchantData()