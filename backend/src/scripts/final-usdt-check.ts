import { db } from "@/db"

async function finalUsdtCheck() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    console.log("=== FINAL USDT CHECK ===")
    console.log("Merchant:", merchant.name)
    console.log("countInRubEquivalent:", merchant.countInRubEquivalent)
    console.log("")
    
    // Get transactions with methods
    const transactions = await db.transaction.findMany({
      where: {
        merchantId: merchant.id,
        status: "READY",
        type: "IN"
      },
      include: {
        method: true
      }
    })
    
    let balanceUsdt = 0
    console.log("Transactions:")
    
    for (const tx of transactions) {
      const commission = tx.amount * (tx.method.commissionPayin / 100)
      const netAmount = tx.amount - commission
      
      if (tx.merchantRate && tx.merchantRate > 0) {
        const usdtAmount = netAmount / tx.merchantRate
        const truncatedUsdt = Math.floor(usdtAmount * 100) / 100
        
        console.log(`- ${tx.id}: ${netAmount} RUB / ${tx.merchantRate} = ${usdtAmount} USDT → ${truncatedUsdt} USDT (truncated)`)
        balanceUsdt += truncatedUsdt
      }
    }
    
    // Check settled amounts
    const settles = await db.settleRequest.findMany({
      where: {
        merchantId: merchant.id,
        status: "COMPLETED"
      }
    })
    
    let settledUsdt = 0
    console.log("\nSettled requests:")
    for (const settle of settles) {
      if (settle.amountUsdt) {
        const truncated = Math.floor(settle.amountUsdt * 100) / 100
        console.log(`- ${settle.id}: ${settle.amountUsdt} USDT → ${truncated} USDT (truncated)`)
        settledUsdt += truncated
      }
    }
    
    console.log("Total settled USDT:", settledUsdt)
    balanceUsdt -= settledUsdt
    
    console.log("\n=== RESULT ===")
    console.log("Final USDT balance:", balanceUsdt)
    console.log("Expected: 99.41 USDT (80.47 + 99.40 - 80.46)")
    console.log("Match:", Math.abs(balanceUsdt - 99.41) < 0.000001 ? "✓" : "✗")
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

finalUsdtCheck()