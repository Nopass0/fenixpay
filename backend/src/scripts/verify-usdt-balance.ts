import { db } from "@/db"

async function verifyUsdtBalance() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    console.log("Verifying USDT balance calculation...")
    console.log("Merchant:", merchant.name)
    console.log("countInRubEquivalent:", merchant.countInRubEquivalent)
    
    // Test API
    const response = await fetch("http://localhost:3000/api/merchant/dashboard/statistics", {
      headers: {
        "Authorization": "Bearer " + merchant.token
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("\nAPI Response:")
      console.log("Balance RUB:", data.balance.total)
      console.log("Balance USDT:", data.balance.totalUsdt)
      
      // Manually calculate
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
      
      let manualUsdt = 0
      console.log("\nManual calculation:")
      
      for (const tx of transactions) {
        if (tx.merchantRate && tx.merchantRate > 0) {
          const commission = tx.amount * (tx.method.commissionPayin / 100)
          const netAmount = tx.amount - commission
          const usdtAmount = netAmount / tx.merchantRate
          const truncated = Math.floor(usdtAmount * 100) / 100
          
          console.log(`TX ${tx.id}: ${netAmount} RUB / ${tx.merchantRate} = ${usdtAmount} USDT → ${truncated} USDT (truncated)`)
          manualUsdt += truncated
        }
      }
      
      // Check settled
      const settles = await db.settleRequest.findMany({
        where: {
          merchantId: merchant.id,
          status: "COMPLETED"
        }
      })
      
      const settledUsdt = settles.reduce((sum, s) => sum + (s.amountUsdt || 0), 0)
      console.log("\nSettled USDT:", settledUsdt)
      
      manualUsdt -= settledUsdt
      
      console.log("\nFinal manual USDT:", manualUsdt)
      console.log("API USDT:", data.balance.totalUsdt)
      console.log("Match:", manualUsdt === data.balance.totalUsdt ? "✓" : "✗")
      
      if (manualUsdt !== data.balance.totalUsdt) {
        console.error("\nERROR: USDT balance mismatch!")
        console.error("Expected:", manualUsdt)
        console.error("Got:", data.balance.totalUsdt)
        console.error("Difference:", data.balance.totalUsdt - manualUsdt)
      }
    } else {
      console.error("Failed to fetch from API:", response.status)
    }
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

verifyUsdtBalance()