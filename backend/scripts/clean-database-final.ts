import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function cleanDatabase() {
  console.log("Starting database cleanup...")
  
  try {
    // 1. Delete all transactions
    console.log("Deleting all transactions...")
    const deletedTransactions = await prisma.transaction.deleteMany({})
    console.log(`✓ Deleted ${deletedTransactions.count} transactions`)
    
    // 2. Reset all trader profits to 0
    console.log("Resetting all trader profits to 0...")
    const updatedTraders = await prisma.user.updateMany({
      data: {
        profitFromDeals: 0,
        profitFromPayouts: 0
      }
    })
    console.log(`✓ Reset profits for ${updatedTraders.count} traders`)
    
    // 3. Delete all devices
    console.log("Deleting all devices...")
    const deletedDevices = await prisma.device.deleteMany({})
    console.log(`✓ Deleted ${deletedDevices.count} devices`)
    
    // 4. Delete all requisites (bank details)
    console.log("Deleting all requisites...")
    const deletedRequisites = await prisma.bankDetail.deleteMany({})
    console.log(`✓ Deleted ${deletedRequisites.count} requisites`)
    
    // 5. Delete all notifications (related to devices)
    console.log("Deleting all notifications...")
    const deletedNotifications = await prisma.notification.deleteMany({})
    console.log(`✓ Deleted ${deletedNotifications.count} notifications`)
    
    // 6. Delete all balance topups
    console.log("Deleting all balance topups...")
    const deletedTopups = await prisma.balanceTopUp.deleteMany({})
    console.log(`✓ Deleted ${deletedTopups.count} balance topups`)
    
    console.log("\n✅ Database cleanup completed successfully!")
    console.log("Note: No new devices or requisites were created as requested.")
    
  } catch (error) {
    console.error("❌ Error during database cleanup:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanDatabase().catch(console.error)