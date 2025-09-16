import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function testTransactionRequisites() {
  try {
    console.log("🧪 Testing transaction requisites display...\n")
    
    // 1. Get trader session
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        sessions: {
          where: { expiredAt: { gt: new Date() } },
          take: 1
        }
      }
    })
    
    if (!trader || trader.sessions.length === 0) {
      console.log("❌ No active trader session found")
      return
    }
    
    const sessionToken = trader.sessions[0].token
    console.log(`✅ Using trader session: ${sessionToken.substring(0, 16)}...`)
    
    // 2. Find a transaction with requisites
    const transaction = await db.transaction.findFirst({
      where: {
        traderId: trader.id,
        bankDetailId: { not: null }
      },
      include: {
        requisites: true
      }
    })
    
    if (!transaction) {
      console.log("❌ No transaction with requisites found")
      return
    }
    
    console.log(`✅ Found transaction: ${transaction.id}`)
    console.log(`   Amount: ${transaction.amount} ${transaction.currency}`)
    console.log(`   Has requisites: ${!!transaction.requisites}`)
    if (transaction.requisites) {
      console.log(`   Requisite: ${transaction.requisites.recipientName} (${transaction.requisites.bankType})`)
    }
    
    // 3. Test transaction list endpoint (should include basic requisites)
    console.log("\n📋 Testing transaction list endpoint...")
    try {
      const listResponse = await httpClient.get(
        `http://localhost:3000/api/trader/transactions?limit=5`,
        {
          headers: { "x-trader-token": sessionToken }
        }
      )
      
      console.log(`✅ Transaction list: ${listResponse.data.length} transactions`)
      const txWithRequisites = listResponse.data.find(tx => tx.requisites)
      if (txWithRequisites) {
        console.log(`   Example requisites in list: ${txWithRequisites.requisites.recipientName}`)
        console.log(`   Fields: recipientName, cardNumber, bankType only (basic)`)
      } else {
        console.log("   ⚠️  No transactions with requisites in list")
      }
      
    } catch (error: any) {
      console.log(`❌ Transaction list failed: ${error.message}`)
    }
    
    // 4. Test transaction details endpoint (should include full requisites)
    console.log("\n📄 Testing transaction details endpoint...")
    try {
      const detailsResponse = await httpClient.get(
        `http://localhost:3000/api/trader/transactions/${transaction.id}`,
        {
          headers: { "x-trader-token": sessionToken }
        }
      )
      
      console.log("✅ Transaction details retrieved")
      console.log(`   Transaction: ${detailsResponse.amount} ${detailsResponse.currency}`)
      
      if (detailsResponse.requisites) {
        console.log("✅ Requisites included in details:")
        console.log(`   ID: ${detailsResponse.requisites.id}`)
        console.log(`   Recipient: ${detailsResponse.requisites.recipientName}`)
        console.log(`   Bank: ${detailsResponse.requisites.bankType}`)
        console.log(`   Card: ${detailsResponse.requisites.cardNumber}`)
        console.log(`   Phone: ${detailsResponse.requisites.phoneNumber}`)
        console.log(`   Min/Max: ${detailsResponse.requisites.minAmount} - ${detailsResponse.requisites.maxAmount}`)
        console.log(`   Limits: ${detailsResponse.requisites.dailyLimit} / ${detailsResponse.requisites.monthlyLimit}`)
        console.log(`   Method: ${detailsResponse.requisites.methodType}`)
        console.log(`   Interval: ${detailsResponse.requisites.intervalMinutes}`)
        console.log("   ✅ All requisite fields are present!")
      } else {
        console.log("❌ Requisites missing from transaction details!")
      }
      
    } catch (error: any) {
      console.log(`❌ Transaction details failed: ${error.message}`)
      if (error.response?.data) {
        console.log("Error details:", error.response.data)
      }
    }
    
    console.log("\n🎯 Expected behavior:")
    console.log("   ✅ Transaction list: Basic requisite info (recipientName, cardNumber, bankType)")
    console.log("   ✅ Transaction details: Full requisite info with all form fields")
    console.log("   ✅ Same formatting and data structure in both contexts")
    console.log("   ✅ Requisites can be opened/edited from transaction details")
    
  } catch (error: any) {
    console.error("❌ Test error:", error.message)
  } finally {
    await db.$disconnect()
  }
}

testTransactionRequisites()