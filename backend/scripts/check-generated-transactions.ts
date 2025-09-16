import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function checkTransactions() {
  try {
    // Get trader
    const trader = await db.user.findFirst({
      where: { email: { contains: "trader" } }
    })

    if (!trader) {
      console.log("❌ No trader found")
      return
    }

    // Get all transactions for this trader
    const transactions = await db.transaction.findMany({
      where: { traderId: trader.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        requisites: true,
        method: true,
        merchant: true,
        receipts: true
      }
    })

    console.log(`\n📊 Found ${transactions.length} recent transactions for trader ${trader.email}\n`)

    // Count by status
    const statusCount: Record<string, number> = {}
    transactions.forEach(tx => {
      statusCount[tx.status] = (statusCount[tx.status] || 0) + 1
    })

    console.log("Status distribution:")
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`- ${status}: ${count}`)
    })

    console.log("\nDetailed transactions:")
    console.log("═".repeat(120))
    
    transactions.forEach(tx => {
      const usdtAmount = tx.frozenUsdtAmount || (tx.amount / (tx.rate || 95))
      console.log(`#${tx.numericId} | ${tx.status.padEnd(11)} | ${tx.amount.toFixed(0).padStart(7)} RUB (${usdtAmount.toFixed(2).padStart(8)} USDT) | ${tx.clientName.padEnd(30)} | ${tx.requisites?.bankType || 'N/A'}`)
      
      if (tx.receipts.length > 0) {
        console.log(`     └─ Has ${tx.receipts.length} receipt(s)`)
      }
    })
    
    console.log("═".repeat(120))

    // Check profit calculation
    const readyTransactions = transactions.filter(tx => tx.status === "READY")
    const totalProfit = readyTransactions.reduce((sum, tx) => sum + (tx.calculatedCommission || 0), 0)
    console.log(`\n💰 Total profit from READY transactions: ${totalProfit.toFixed(2)} USDT`)

  } catch (error) {
    console.error("❌ Error checking transactions:", error)
  } finally {
    await db.$disconnect()
  }
}

checkTransactions().catch(console.error)