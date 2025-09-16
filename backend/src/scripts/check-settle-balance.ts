import { db } from "@/db"

async function checkSettleBalance() {
  try {
    const merchantId = "cmdhsl7mm01koikbmm02684xd"
    
    // Get all transactions
    const transactions = await db.transaction.findMany({
      where: { 
        merchantId,
        status: "READY" 
      },
    })
    
    console.log("\nTransactions detail:")
    transactions.forEach(tx => {
      console.log(`- ID: ${tx.id}, Amount: ${tx.amount}, Commission: ${tx.commission}`)
    })
    
    // Get all payouts
    const payouts = await db.payout.findMany({
      where: { 
        merchantId,
        status: "COMPLETED" 
      },
    })
    
    // Get all settle requests
    const settleRequests = await db.settleRequest.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" }
    })
    
    // Check if 9376.2 is mentioned anywhere
    console.log("\nChecking if balance 9376.2 exists in any transaction or settle:")
    const targetAmount = 9376.2
    const possibleSettleAmount = 10418 - targetAmount // 1041.8
    console.log("Looking for settle amount:", possibleSettleAmount)
    
    const dealsTotal = transactions.reduce((sum, t) => sum + t.amount, 0)
    const dealsCommission = transactions.reduce((sum, t) => sum + t.commission, 0)
    const payoutsTotal = payouts.reduce((sum, p) => sum + p.amount, 0)
    const payoutsCommission = payouts.reduce((sum, p) => sum + (p.amount * (p.feePercent || 0) / 100), 0)
    
    console.log("Balance calculation:")
    console.log("- Deals total:", dealsTotal)
    console.log("- Deals commission:", dealsCommission)
    console.log("- Payouts total:", payoutsTotal)
    console.log("- Payouts commission:", payoutsCommission)
    
    console.log("\nSettle requests:")
    settleRequests.forEach(sr => {
      console.log(`- ${sr.id}: ${sr.amount} ₽ (${sr.status})`)
    })
    
    const completedSettles = settleRequests.filter(sr => sr.status === "COMPLETED")
    const settledAmount = completedSettles.reduce((sum, s) => sum + s.amount, 0)
    
    console.log("\nCompleted settles total:", settledAmount)
    
    const balance = dealsTotal - dealsCommission - payoutsTotal - payoutsCommission - settledAmount
    console.log("\nFinal balance:", balance)
    
    // Check if there's a specific transaction causing the difference
    const expectedDiff = 10418 - 9376.2
    console.log("\nExpected difference:", expectedDiff)
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

checkSettleBalance()