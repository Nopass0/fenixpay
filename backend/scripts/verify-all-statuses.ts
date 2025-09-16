import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function verifyAllStatuses() {
  try {
    // Get trader
    const trader = await db.user.findFirst({
      where: { email: { contains: "trader" } }
    })

    if (!trader) {
      console.log("❌ No trader found")
      return
    }

    // Get count by status for last 100 transactions
    const statusCounts = await db.transaction.groupBy({
      by: ['status'],
      where: { traderId: trader.id },
      _count: true,
      orderBy: { _count: { status: 'desc' } }
    })

    console.log("\n📊 All transaction statuses for trader:")
    console.log("═".repeat(40))
    
    const statusLabels: Record<string, string> = {
      CREATED: "Ожидает",
      IN_PROGRESS: "В работе",
      READY: "Выполнено",
      EXPIRED: "Истекло",
      CANCELED: "Отменено",
      DISPUTE: "Спор",
      MILK: "MILK"
    }
    
    statusCounts.forEach(({ status, _count }) => {
      console.log(`${status.padEnd(12)} (${statusLabels[status] || status}): ${_count}`)
    })
    
    console.log("═".repeat(40))

    // Get sample transactions for each status
    console.log("\n📝 Sample transactions for each status:")
    
    const statuses = ["CREATED", "IN_PROGRESS", "READY", "EXPIRED", "CANCELED", "DISPUTE", "MILK"]
    
    for (const status of statuses) {
      const sample = await db.transaction.findFirst({
        where: { 
          traderId: trader.id,
          status: status as any
        },
        orderBy: { createdAt: 'desc' },
        include: { requisites: true }
      })
      
      if (sample) {
        console.log(`\n${status} (${statusLabels[status]}):`);
        console.log(`  #${sample.numericId} - ${sample.amount} RUB - ${sample.clientName}`)
        console.log(`  Bank: ${sample.requisites?.bankType || sample.assetOrBank}`)
        console.log(`  Created: ${sample.createdAt.toLocaleString('ru-RU')}`)
      }
    }

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

verifyAllStatuses().catch(console.error)