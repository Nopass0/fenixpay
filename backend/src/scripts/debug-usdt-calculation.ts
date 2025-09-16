import { db } from "@/db"

async function debugUsdtCalculation() {
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
    console.log("")
    
    // Get all successful transactions
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
    
    console.log("Found", transactions.length, "successful transactions")
    console.log("")
    
    let totalRub = 0
    let totalUsdt = 0
    let totalCommissionRub = 0
    
    for (const tx of transactions) {
      const commission = tx.amount * (tx.method.commissionPayin / 100)
      const netAmount = tx.amount - commission
      const usdtAmount = tx.merchantRate ? netAmount / tx.merchantRate : 0
      
      console.log(`Transaction ${tx.id}:`)
      console.log(`  Amount: ${tx.amount} RUB`)
      console.log(`  Commission (${tx.method.commissionPayin}%): ${commission} RUB`)
      console.log(`  Net amount: ${netAmount} RUB`)
      console.log(`  Merchant rate: ${tx.merchantRate || 'NULL'} RUB/USDT`)
      console.log(`  USDT amount: ${usdtAmount} USDT`)
      console.log(`  USDT truncated: ${Math.floor(usdtAmount * 100) / 100} USDT`)
      console.log("")
      
      totalRub += netAmount
      totalCommissionRub += commission
      if (tx.merchantRate) {
        totalUsdt += usdtAmount
      }
    }
    
    console.log("TOTALS:")
    console.log("Total RUB (after commission):", totalRub)
    console.log("Total commission RUB:", totalCommissionRub)
    console.log("Total USDT (exact):", totalUsdt)
    console.log("Total USDT (truncated to 2 decimals):", Math.floor(totalUsdt * 100) / 100)
    
    // Check payouts
    const payouts = await db.payout.findMany({
      where: {
        merchantId: merchant.id,
        status: "COMPLETED"
      },
      include: {
        method: true
      }
    })
    
    console.log("\nFound", payouts.length, "completed payouts")
    
    let totalPayoutRub = 0
    let totalPayoutUsdt = 0
    
    for (const payout of payouts) {
      const commission = payout.amount * (payout.method.commissionPayout / 100)
      const totalAmount = payout.amount + commission
      const usdtAmount = payout.merchantRate ? totalAmount / payout.merchantRate : 0
      
      console.log(`\nPayout ${payout.id}:`)
      console.log(`  Amount: ${payout.amount} RUB`)
      console.log(`  Commission (${payout.method.commissionPayout}%): ${commission} RUB`)
      console.log(`  Total amount: ${totalAmount} RUB`)
      console.log(`  Merchant rate: ${payout.merchantRate || 'NULL'} RUB/USDT`)
      console.log(`  USDT amount: ${usdtAmount} USDT`)
      
      totalPayoutRub += totalAmount
      if (payout.merchantRate) {
        totalPayoutUsdt += usdtAmount
      }
    }
    
    // Check settled amounts
    const settleRequests = await db.settleRequest.findMany({
      where: {
        merchantId: merchant.id,
        status: "COMPLETED"
      }
    })
    
    const settledUsdt = settleRequests.reduce((sum, s) => sum + (s.amountUsdt || 0), 0)
    
    console.log("\n\nFINAL BALANCE CALCULATION:")
    console.log("Income USDT:", totalUsdt)
    console.log("Payout USDT:", totalPayoutUsdt)
    console.log("Settled USDT:", settledUsdt)
    console.log("Final USDT balance:", totalUsdt - totalPayoutUsdt - settledUsdt)
    console.log("Final USDT balance (truncated):", Math.floor((totalUsdt - totalPayoutUsdt - settledUsdt) * 100) / 100)
    
    // Compare with API
    console.log("\n\nChecking API response...")
    const response = await fetch("http://localhost:3001/api/merchant/dashboard/statistics", {
      headers: {
        "Authorization": "Bearer " + merchant.token
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("API Balance RUB:", data.balance.total)
      console.log("API Balance USDT:", data.balance.totalUsdt)
      console.log("API Balance USDT (should be truncated):", Math.floor(data.balance.totalUsdt * 100) / 100)
      
      if (data.balance.totalUsdt !== undefined) {
        const expectedTruncated = Math.floor((totalUsdt - totalPayoutUsdt - settledUsdt) * 100) / 100
        if (Math.abs(data.balance.totalUsdt - expectedTruncated) > 0.01) {
          console.error("\nERROR: USDT balance mismatch!")
          console.error("Expected:", expectedTruncated)
          console.error("Got:", data.balance.totalUsdt)
        }
      }
    }
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

debugUsdtCalculation()