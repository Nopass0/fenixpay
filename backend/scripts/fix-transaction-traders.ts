import { db } from "../src/db"

async function fixTransactionTraders() {
  try {
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    // Find transactions that belong to trader but don't have traderId set
    const transactions = await db.transaction.findMany({
      where: { 
        userId: trader.id,
        traderId: null
      },
      include: { requisites: true }
    })
    
    console.log(`Found ${transactions.length} transactions to fix`)
    
    // Update trader ID on all transactions
    for (const tx of transactions) {
      await db.transaction.update({
        where: { id: tx.id },
        data: { traderId: trader.id }
      })
      console.log(`✅ Fixed transaction: ${tx.id} (${tx.amount} ${tx.currency})`)
    }
    
    // Verify the fix
    const updated = await db.transaction.findMany({
      where: { traderId: trader.id },
      include: { requisites: true }
    })
    
    console.log(`\n📊 Results:`)
    console.log(`   Transactions with trader ID: ${updated.length}`)
    console.log(`   With requisites: ${updated.filter(tx => tx.requisites).length}`)
    
    if (updated.length > 0) {
      const example = updated.find(tx => tx.requisites)
      if (example) {
        console.log(`   Example: ${example.amount} ${example.currency} → ${example.requisites.recipientName}`)
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

fixTransactionTraders()