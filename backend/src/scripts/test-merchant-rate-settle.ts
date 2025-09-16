import { db } from "@/db"
import { RapiraService } from "@/services/rapira.service"

async function testMerchantRateSettle() {
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
    
    // Create test transactions with different merchant rates
    const tx1 = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 1000,
        merchantRate: 90, // Курс мерчанта
        rate: 93, // Курс Rapira с KKK
        status: "READY",
        methodId: "cmdhs7x6900nwikbmfmlqnkkw", // с2с
        orderId: "test-order-1",
        assetOrBank: "SBERBANK",
        callbackUri: "https://test.com/callback",
        successUri: "https://test.com/success",
        failUri: "https://test.com/fail",
        clientName: "Test Client 1",
        commission: 0,
        expired_at: new Date(Date.now() + 3600000),
        userId: "cmdhs7x6900o6ikbmk9zy2g3o", // test user
      }
    })
    console.log("\nCreated transaction 1:")
    console.log("- Amount:", tx1.amount, "RUB")
    console.log("- Merchant rate:", tx1.merchantRate)
    console.log("- USDT equivalent:", tx1.amount / (tx1.merchantRate || 1))
    
    const tx2 = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 2000,
        merchantRate: 95, // Другой курс мерчанта
        rate: 93,
        status: "READY",
        methodId: "cmdhs7x6900nwikbmfmlqnkkw",
        orderId: "test-order-2",
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
    console.log("\nCreated transaction 2:")
    console.log("- Amount:", tx2.amount, "RUB")
    console.log("- Merchant rate:", tx2.merchantRate)
    console.log("- USDT equivalent:", tx2.amount / (tx2.merchantRate || 1))
    
    // Calculate expected USDT balance
    const method = await db.method.findUnique({
      where: { id: "cmdhs7x6900nwikbmfmlqnkkw" }
    })
    
    const commission1 = tx1.amount * (method?.commissionPayin || 0) / 100
    const commission2 = tx2.amount * (method?.commissionPayin || 0) / 100
    
    console.log("\nCommission calculation:")
    console.log("- Method commission:", method?.commissionPayin, "%")
    console.log("- Commission tx1:", commission1, "RUB")
    console.log("- Commission tx2:", commission2, "RUB")
    
    if (!merchant.countInRubEquivalent) {
      // Using merchant rates
      const usdt1 = (tx1.amount - commission1) / (tx1.merchantRate || 1)
      const usdt2 = (tx2.amount - commission2) / (tx2.merchantRate || 1)
      const totalUsdt = usdt1 + usdt2
      
      console.log("\nUSDT calculation (using merchant rates):")
      console.log("- USDT from tx1:", usdt1)
      console.log("- USDT from tx2:", usdt2)
      console.log("- Total USDT:", totalUsdt)
    } else {
      // Using Rapira rate
      const rapiraService = RapiraService.getInstance()
      const rapiraRate = await rapiraService.getUsdtRubRate()
      const totalRub = (tx1.amount - commission1) + (tx2.amount - commission2)
      const totalUsdt = totalRub / rapiraRate
      
      console.log("\nUSDT calculation (using Rapira rate):")
      console.log("- Total RUB after commission:", totalRub)
      console.log("- Rapira rate:", rapiraRate)
      console.log("- Total USDT:", totalUsdt)
    }
    
    // Test creating settle request
    console.log("\nTesting settle request creation...")
    const response = await fetch("http://localhost:3001/api/merchant/dashboard/settle-request", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + merchant.token,
        "Content-Type": "application/json"
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("\nSettle request created:")
      console.log("- Amount RUB:", data.request.amount)
      console.log("- Amount USDT:", data.request.amountUsdt)
      console.log("- Rate:", data.request.rate)
    } else {
      console.error("Failed to create settle request:", response.status, await response.text())
    }
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

testMerchantRateSettle()