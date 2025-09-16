import { db } from "@/db"

async function debugBalance() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    // Get last completed settle
    const lastCompletedSettle = await db.settleRequest.findFirst({
      where: {
        merchantId: merchant.id,
        status: "COMPLETED"
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log("Last completed settle:")
    console.log("- Created at:", lastCompletedSettle?.createdAt.toISOString())
    console.log("- Amount:", lastCompletedSettle?.amount, "RUB")
    console.log("- Amount USDT:", lastCompletedSettle?.amountUsdt)
    
    const dateFilter = lastCompletedSettle?.createdAt 
      ? { createdAt: { gt: lastCompletedSettle.createdAt } }
      : {}
    
    // Get transactions after last settle
    const transactions = await db.transaction.findMany({
      where: {
        merchantId: merchant.id,
        status: "READY",
        type: "IN",
        ...dateFilter
      },
      include: {
        method: true
      }
    })
    
    console.log("\nTransactions after last settle:")
    let totalUsdt = 0
    for (const tx of transactions) {
      const commission = tx.amount * (tx.method.commissionPayin / 100)
      const netAmount = tx.amount - commission
      const usdtAmount = tx.merchantRate ? netAmount / tx.merchantRate : 0
      const truncatedUsdt = Math.floor(usdtAmount * 100) / 100
      console.log(`- ${tx.id}: ${tx.amount} RUB - ${commission} commission = ${netAmount} RUB / ${tx.merchantRate} = ${usdtAmount} USDT → ${truncatedUsdt} USDT`)
      totalUsdt += truncatedUsdt
    }
    
    console.log("\nTotal USDT from transactions:", totalUsdt)
    
    // Check if there are pending settles
    const pendingSettles = await db.settleRequest.findMany({
      where: {
        merchantId: merchant.id,
        status: "PENDING"
      }
    })
    
    console.log("\nPending settles:", pendingSettles.length)
    for (const settle of pendingSettles) {
      console.log(`- ${settle.id}: ${settle.amount} RUB / ${settle.amountUsdt} USDT`)
    }
    
    // Check all settles
    const allSettles = await db.settleRequest.findMany({
      where: {
        merchantId: merchant.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    console.log("\nAll settle requests:")
    let totalSettledUsdt = 0
    for (const settle of allSettles) {
      if (settle.status === "COMPLETED" && settle.amountUsdt) {
        const truncated = Math.floor(settle.amountUsdt * 100) / 100
        totalSettledUsdt += truncated
        console.log(`- ${settle.id}: ${settle.status} - ${settle.amount} RUB / ${settle.amountUsdt} USDT → ${truncated} USDT (created: ${settle.createdAt.toISOString()})`)
      } else {
        console.log(`- ${settle.id}: ${settle.status} - ${settle.amount} RUB / ${settle.amountUsdt} USDT (created: ${settle.createdAt.toISOString()})`)
      }
    }
    
    console.log("\nTotal settled USDT:", totalSettledUsdt)
    console.log("Expected balance USDT:", totalUsdt - totalSettledUsdt)
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

debugBalance()