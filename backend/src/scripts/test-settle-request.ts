import { db } from "@/db"
import { RapiraService } from "@/services/rapira.service"

async function testSettleRequest() {
  try {
    console.log("Testing settle request creation...")
    
    // Find merchant
    const merchant = await db.merchant.findFirst({
      where: { disabled: false }
    })
    
    if (!merchant) {
      console.error("No active merchant found")
      return
    }
    
    console.log("Found merchant:", merchant.id, merchant.name)
    
    // Check for pending requests
    const pendingRequest = await db.settleRequest.findFirst({
      where: {
        merchantId: merchant.id,
        status: "PENDING",
      },
    })
    
    if (pendingRequest) {
      console.log("Merchant already has pending request:", pendingRequest.id)
      return
    }
    
    // Calculate balance
    const [transactions, payouts, completedSettles] = await Promise.all([
      db.transaction.findMany({
        where: { 
          merchantId: merchant.id,
          status: "READY" 
        },
        select: { amount: true, commission: true },
      }),
      db.payout.findMany({
        where: { 
          merchantId: merchant.id,
          status: "COMPLETED" 
        },
        select: { amount: true, feePercent: true },
      }),
      db.settleRequest.findMany({
        where: { 
          merchantId: merchant.id,
          status: "COMPLETED"
        },
        select: { amount: true },
      })
    ])
    
    const dealsTotal = transactions.reduce((sum, t) => sum + t.amount, 0)
    const dealsCommission = transactions.reduce((sum, t) => sum + t.commission, 0)
    const payoutsTotal = payouts.reduce((sum, p) => sum + p.amount, 0)
    const payoutsCommission = payouts.reduce((sum, p) => sum + (p.amount * p.feePercent / 100), 0)
    const settledAmount = completedSettles.reduce((sum, s) => sum + s.amount, 0)
    
    const balance = dealsTotal - dealsCommission - payoutsTotal - payoutsCommission - settledAmount
    
    console.log("Balance calculation:", {
      dealsTotal,
      dealsCommission,
      payoutsTotal,
      payoutsCommission,
      settledAmount,
      balance
    })
    
    if (balance <= 0) {
      console.log("Insufficient balance for withdrawal")
      return
    }
    
    // Get Rapira rate
    console.log("Getting Rapira rate...")
    const rapiraService = RapiraService.getInstance()
    const rate = await rapiraService.getRate()
    console.log("Rapira rate:", rate)
    
    const amountUsdt = balance / rate
    console.log("USDT equivalent:", amountUsdt)
    
    // Create settle request
    const settleRequest = await db.settleRequest.create({
      data: {
        merchantId: merchant.id,
        amount: balance,
        amountUsdt,
        rate,
      },
    })
    
    console.log("Created settle request:", settleRequest)
    
  } catch (error) {
    console.error("Error in test:", error)
    console.error("Stack:", error instanceof Error ? error.stack : "No stack")
  } finally {
    await db.$disconnect()
  }
}

testSettleRequest()