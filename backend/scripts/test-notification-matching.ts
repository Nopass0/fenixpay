import { db } from "../src/db"

async function testNotificationMatching() {
  try {
    console.log("🔍 Testing notification matching logic...\n")
    
    // 1. Find a recent notification
    const notification = await db.notification.findFirst({
      where: {
        createdAt: { gte: new Date(Date.now() - 600000) }, // Last 10 minutes
      },
      include: {
        Device: {
          include: {
            bankDetails: true,
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!notification) {
      console.log("❌ No notification found with amount 27,308")
      return
    }
    
    console.log("📬 Found notification:")
    console.log(`   ID: ${notification.id}`)
    console.log(`   Message: ${notification.message}`)
    console.log(`   Title: ${notification.title}`)
    console.log(`   Package: ${notification.metadata?.packageName || 'not set'}`)
    console.log(`   Device: ${notification.Device?.name}`)
    console.log(`   Device ID: ${notification.deviceId}`)
    console.log(`   Bank Details: ${notification.Device?.bankDetails?.length || 0}`)
    
    if (notification.Device?.bankDetails && notification.Device.bankDetails.length > 0) {
      const bankDetail = notification.Device.bankDetails[0]
      console.log(`\n🏦 Bank Detail:`)
      console.log(`   ID: ${bankDetail.id}`)
      console.log(`   Bank Type: ${bankDetail.bankType}`)
      console.log(`   Recipient: ${bankDetail.recipientName}`)
      console.log(`   User ID: ${bankDetail.userId}`)
      
      // 2. Look for matching transaction
      console.log("\n💰 Looking for matching transaction...")
      
      // Extract amount from message
      const amountMatch = notification.message.match(/([\d\s]+)\s*₽/)
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(/\s/g, ''))
        console.log(`   Extracted amount: ${amount}`)
        
        // Find transaction with CREATED status
        const transaction = await db.transaction.findFirst({
          where: {
            bankDetailId: bankDetail.id,
            amount: amount,
            type: "IN",
            status: "CREATED",
            traderId: bankDetail.userId
          }
        })
        
        if (transaction) {
          console.log(`\n✅ Found matching transaction!`)
          console.log(`   Transaction ID: ${transaction.id}`)
          console.log(`   Amount: ${transaction.amount}`)
          console.log(`   Status: ${transaction.status}`)
          console.log(`   Created: ${transaction.createdAt}`)
          console.log(`   Bank Detail ID: ${transaction.bankDetailId}`)
          console.log(`   Trader ID: ${transaction.traderId}`)
          
          // Check why it might not match
          if (transaction.bankDetailId !== bankDetail.id) {
            console.log(`\n❌ Bank Detail ID mismatch!`)
          }
          if (transaction.traderId !== bankDetail.userId) {
            console.log(`\n❌ Trader ID mismatch!`)
          }
        } else {
          console.log(`\n❌ No matching transaction found`)
          
          // Look for any transactions with this amount
          const anyTransaction = await db.transaction.findFirst({
            where: {
              amount: amount,
              status: { in: ["CREATED", "IN_PROGRESS"] }
            },
            include: {
              requisites: true
            }
          })
          
          if (anyTransaction) {
            console.log(`\n⚠️  Found transaction with same amount but different criteria:`)
            console.log(`   Transaction ID: ${anyTransaction.id}`)
            console.log(`   Bank Detail ID: ${anyTransaction.bankDetailId}`)
            console.log(`   Trader ID: ${anyTransaction.traderId}`)
            console.log(`   Status: ${anyTransaction.status}`)
            console.log(`   Requisite: ${anyTransaction.requisites?.recipientName}`)
          }
        }
      }
    }
    
    // 3. Check notification metadata structure
    console.log("\n📋 Notification metadata:")
    console.log(JSON.stringify(notification.metadata, null, 2))
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

testNotificationMatching()