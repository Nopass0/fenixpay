import { db } from "@/db"

async function checkTiming() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    // Get all transactions
    const transactions = await db.transaction.findMany({
      where: {
        merchantId: merchant.id,
        status: "READY",
        type: "IN"
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        method: true
      }
    })
    
    // Get all settle requests
    const settles = await db.settleRequest.findMany({
      where: {
        merchantId: merchant.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    console.log("=== TIMELINE ===")
    
    const events: Array<{time: Date, type: string, data: any}> = []
    
    // Add transactions to timeline
    for (const tx of transactions) {
      events.push({
        time: tx.createdAt,
        type: 'TRANSACTION',
        data: tx
      })
    }
    
    // Add settle requests to timeline
    for (const settle of settles) {
      events.push({
        time: settle.createdAt,
        type: 'SETTLE_CREATED',
        data: settle
      })
      if (settle.processedAt) {
        events.push({
          time: settle.processedAt,
          type: 'SETTLE_PROCESSED',
          data: settle
        })
      }
    }
    
    // Sort by time
    events.sort((a, b) => a.time.getTime() - b.time.getTime())
    
    // Display timeline
    for (const event of events) {
      if (event.type === 'TRANSACTION') {
        const tx = event.data
        const commission = tx.amount * (tx.method.commissionPayin / 100)
        const netAmount = tx.amount - commission
        const usdtAmount = tx.merchantRate ? netAmount / tx.merchantRate : 0
        const truncatedUsdt = Math.floor(usdtAmount * 100) / 100
        console.log(`${event.time.toISOString()} - TRANSACTION ${tx.id}: ${tx.amount} RUB → ${truncatedUsdt} USDT`)
      } else if (event.type === 'SETTLE_CREATED') {
        const settle = event.data
        console.log(`${event.time.toISOString()} - SETTLE CREATED ${settle.id}: ${settle.amount} RUB / ${settle.amountUsdt} USDT`)
      } else if (event.type === 'SETTLE_PROCESSED') {
        const settle = event.data
        console.log(`${event.time.toISOString()} - SETTLE PROCESSED ${settle.id}`)
      }
    }
    
    console.log("\n=== ANALYSIS ===")
    
    // Find last completed settle
    const lastCompletedSettle = settles.find(s => s.status === 'COMPLETED' && s.processedAt)
    if (lastCompletedSettle) {
      console.log("\nLast completed settle:")
      console.log("- Created at:", lastCompletedSettle.createdAt.toISOString())
      console.log("- Processed at:", lastCompletedSettle.processedAt?.toISOString())
      
      console.log("\nTransactions that should be counted (created after settle creation):")
      for (const tx of transactions) {
        if (tx.createdAt > lastCompletedSettle.createdAt) {
          const commission = tx.amount * (tx.method.commissionPayin / 100)
          const netAmount = tx.amount - commission
          const usdtAmount = tx.merchantRate ? netAmount / tx.merchantRate : 0
          const truncatedUsdt = Math.floor(usdtAmount * 100) / 100
          console.log(`- ${tx.id}: ${truncatedUsdt} USDT`)
        }
      }
    }
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

checkTiming()