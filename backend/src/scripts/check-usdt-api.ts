import { db } from "@/db"

async function checkUsdtApi() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    console.log("Merchant token:", merchant.token)
    
    // First check auth
    const authResponse = await fetch("http://localhost:3001/api/merchant/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token: merchant.token })
    })
    
    if (!authResponse.ok) {
      console.error("Auth failed:", authResponse.status)
      return
    }
    
    const authData = await authResponse.json()
    console.log("Auth success, session token:", authData.sessionToken)
    
    // Now test statistics
    const response = await fetch("http://localhost:3001/api/merchant/dashboard/statistics", {
      headers: {
        "Authorization": "Bearer " + authData.sessionToken
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("\nStatistics response:")
      console.log("Balance RUB:", data.balance.total)
      console.log("Balance USDT:", data.balance.totalUsdt)
      console.log("countInRubEquivalent:", merchant.countInRubEquivalent)
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

checkUsdtApi()