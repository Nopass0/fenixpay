import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function testApiDirectly() {
  try {
    // Get trader session
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        sessions: { where: { expiredAt: { gt: new Date() } }, take: 1 }
      }
    })
    
    const sessionToken = trader.sessions[0].token
    
    // Find a transaction
    const transaction = await db.transaction.findFirst({
      where: { 
        traderId: trader.id,
        bankDetailId: { not: null }
      }
    })
    
    console.log(`Testing transaction: ${transaction.id}`)
    
    try {
      const response = await httpClient.get(
        `http://localhost:3000/api/trader/transactions/${transaction.id}`,
        {
          headers: { "x-trader-token": sessionToken }
        }
      )
      
      console.log("\n📄 Raw API Response:")
      console.log("Has requisites field:", "requisites" in response)
      console.log("Requisites value:", response.requisites)
      console.log("Keys in response:", Object.keys(response).slice(0, 10))
      
      if (response.requisites) {
        console.log("\n✅ Requisites found in API response:")
        console.log(JSON.stringify(response.requisites, null, 2))
      } else {
        console.log("\n❌ Requisites NOT found in API response")
        console.log("Fields available:", Object.keys(response).filter(k => k.includes('req') || k.includes('bank') || k.includes('detail')))
      }
      
    } catch (error) {
      console.error("API Error:", error.message)
      if (error.response) {
        console.error("Response status:", error.response.status)
        console.error("Response data:", error.response.data)
      }
    }
    
  } catch (error) {
    console.error("Setup Error:", error)
  } finally {
    await db.$disconnect()
  }
}

testApiDirectly()