import { db } from "@/db"

async function testUsdtBalance() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    console.log("Merchant settings:")
    console.log("- Name:", merchant.name)
    console.log("- countInRubEquivalent:", merchant.countInRubEquivalent)
    
    // Ensure countInRubEquivalent is false
    if (merchant.countInRubEquivalent) {
      await db.merchant.update({
        where: { id: merchant.id },
        data: { countInRubEquivalent: false }
      })
      console.log("Updated countInRubEquivalent to false")
    }
    
    // Create test transactions with different rates
    const method = await db.method.findFirst({
      where: { isEnabled: true }
    })
    
    if (!method) {
      console.error("No active method found")
      return
    }
    
    console.log("\nUsing method:", method.name, "Commission:", method.commissionPayin + "%")
    
    // Create transactions
    const tx1 = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 10000, // 10,000 RUB
        merchantRate: 90, // 90 RUB/USDT
        rate: 93,
        status: "READY",
        methodId: method.id,
        orderId: "test-usdt-1",
        assetOrBank: "SBERBANK",
        callbackUri: "https://test.com/callback",
        successUri: "https://test.com/success",
        failUri: "https://test.com/fail",
        clientName: "Test Client 1",
        commission: 0,
        expired_at: new Date(Date.now() + 3600000),
        userId: "cmdhs7x6900o6ikbmk9zy2g3o",
      }
    })
    
    const tx2 = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 20000, // 20,000 RUB
        merchantRate: 95, // 95 RUB/USDT
        rate: 93,
        status: "READY",
        methodId: method.id,
        orderId: "test-usdt-2",
        assetOrBank: "SBERBANK",
        callbackUri: "https://test.com/callback",
        successUri: "https://test.com/success",
        failUri: "https://test.com/fail",
        clientName: "Test Client 2",
        commission: 0,
        expired_at: new Date(Date.now() + 3600000),
        userId: "cmdhs7x6900o6ikbmk9zy2g3o",
      }
    })
    
    console.log("\nCreated transactions:")
    console.log("TX1: 10,000 RUB at 90 RUB/USDT = ", 10000/90, "USDT")
    console.log("TX2: 20,000 RUB at 95 RUB/USDT = ", 20000/95, "USDT")
    
    // Calculate expected USDT balance
    const commission1 = 10000 * (method.commissionPayin / 100)
    const commission2 = 20000 * (method.commissionPayin / 100)
    const netAmount1 = 10000 - commission1
    const netAmount2 = 20000 - commission2
    const usdt1 = netAmount1 / 90
    const usdt2 = netAmount2 / 95
    const totalUsdt = usdt1 + usdt2
    
    console.log("\nExpected USDT calculation:")
    console.log("TX1 net amount:", netAmount1, "RUB ->", usdt1, "USDT")
    console.log("TX2 net amount:", netAmount2, "RUB ->", usdt2, "USDT")
    console.log("Total USDT:", totalUsdt)
    console.log("Truncated to 2 decimals:", Math.floor(totalUsdt * 100) / 100)
    
    // Test API
    console.log("\nFetching statistics from API...")
    const response = await fetch("http://localhost:3001/api/merchant/dashboard/statistics", {
      headers: {
        "Authorization": "Bearer " + merchant.token
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("\nAPI Response:")
      console.log("Balance RUB:", data.balance.total)
      console.log("Balance USDT:", data.balance.totalUsdt)
      console.log("Balance USDT truncated:", Math.floor(data.balance.totalUsdt * 100) / 100)
    } else {
      console.error("Failed to fetch statistics:", response.status)
    }
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

testUsdtBalance()