import { db } from "@/db"

async function testBalanceWithAuth() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    console.log("Merchant:", merchant.name)
    console.log("countInRubEquivalent:", merchant.countInRubEquivalent)
    
    // First authenticate
    const authResponse = await fetch("http://localhost:3000/api/merchant/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token: merchant.token })
    })
    
    if (!authResponse.ok) {
      console.error("Auth failed:", authResponse.status)
      const error = await authResponse.text()
      console.error("Error:", error)
      return
    }
    
    const authData = await authResponse.json()
    console.log("Auth success, session token:", authData.sessionToken)
    
    // Now test statistics
    const response = await fetch("http://localhost:3000/api/merchant/dashboard/statistics", {
      headers: {
        "Authorization": "Bearer " + authData.sessionToken
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("\nAPI Response:")
      console.log("Balance RUB:", data.balance.total)
      console.log("Balance USDT:", data.balance.totalUsdt)
      console.log("Rate calculation:", data.balance.formula.rateCalculation)
      
      // Check transactions included
      const transactions = await db.transaction.findMany({
        where: {
          merchantId: merchant.id,
          status: "READY",
          type: "IN"
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          method: true
        }
      })
      
      console.log("\nTransactions found:", transactions.length)
      for (const tx of transactions) {
        const commission = tx.amount * (tx.method.commissionPayin / 100)
        const netAmount = tx.amount - commission
        const usdtAmount = tx.merchantRate ? netAmount / tx.merchantRate : 0
        const truncatedUsdt = Math.floor(usdtAmount * 100) / 100
        console.log(`- ${tx.id}: ${netAmount} RUB / ${tx.merchantRate || 'N/A'} = ${truncatedUsdt} USDT (created: ${tx.createdAt.toISOString()})`)
      }
      
      // Check last completed settle
      const lastSettle = await db.settleRequest.findFirst({
        where: {
          merchantId: merchant.id,
          status: "COMPLETED"
        },
        orderBy: {
          processedAt: 'desc'
        }
      })
      
      if (lastSettle) {
        console.log("\nLast completed settle:")
        console.log("- ID:", lastSettle.id)
        console.log("- Amount:", lastSettle.amount, "RUB")
        console.log("- Amount USDT:", lastSettle.amountUsdt)
        console.log("- Processed at:", lastSettle.processedAt?.toISOString())
      }
      
    } else {
      console.error("Statistics failed:", response.status)
      const error = await response.text()
      console.error("Error:", error)
    }
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

testBalanceWithAuth()