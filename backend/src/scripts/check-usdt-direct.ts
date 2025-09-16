import { db } from "@/db"

async function checkUsdtDirect() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    console.log("Merchant token:", merchant.token)
    console.log("countInRubEquivalent:", merchant.countInRubEquivalent)
    
    // Test statistics with merchant token directly
    const response = await fetch("http://localhost:3001/api/merchant/dashboard/statistics", {
      headers: {
        "Authorization": "Bearer " + merchant.token
      }
    })
    
    console.log("Response status:", response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log("\nStatistics response:")
      console.log("Balance RUB:", data.balance.total)
      console.log("Balance USDT:", data.balance.totalUsdt)
      console.log("Balance formula:", data.balance.formula)
    } else {
      const error = await response.text()
      console.error("Error:", error)
    }
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

checkUsdtDirect()