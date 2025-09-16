import { db } from "../src/db"

async function cleanDevicesRequisitesTransactions() {
  try {
    console.log("🧹 Cleaning devices, requisites, and transactions...\n")
    
    // 1. Delete all notifications first (they reference devices)
    console.log("📬 Deleting all notifications...")
    const deletedNotifications = await db.notification.deleteMany({})
    console.log(`✅ Deleted ${deletedNotifications.count} notifications`)
    
    // 2. Delete all receipts (they reference transactions)
    console.log("\n📄 Deleting all receipts...")
    const deletedReceipts = await db.receipt.deleteMany({})
    console.log(`✅ Deleted ${deletedReceipts.count} receipts`)
    
    // 3. Delete all transactions
    console.log("\n💸 Deleting all transactions...")
    const deletedTransactions = await db.transaction.deleteMany({})
    console.log(`✅ Deleted ${deletedTransactions.count} transactions`)
    
    // 4. Delete all devices
    console.log("\n📱 Deleting all devices...")
    const deletedDevices = await db.device.deleteMany({})
    console.log(`✅ Deleted ${deletedDevices.count} devices`)
    
    // 5. Delete all bank details (requisites)
    console.log("\n🏦 Deleting all bank details (requisites)...")
    const deletedBankDetails = await db.bankDetail.deleteMany({})
    console.log(`✅ Deleted ${deletedBankDetails.count} bank details`)
    
    // 6. Verify the cleanup
    console.log("\n📊 Verifying cleanup...")
    const counts = {
      notifications: await db.notification.count(),
      receipts: await db.receipt.count(),
      transactions: await db.transaction.count(),
      devices: await db.device.count(),
      bankDetails: await db.bankDetail.count()
    }
    
    console.log("\n✅ Final state:")
    console.log(`   Notifications: ${counts.notifications}`)
    console.log(`   Receipts: ${counts.receipts}`)
    console.log(`   Transactions: ${counts.transactions}`)
    console.log(`   Devices: ${counts.devices}`)
    console.log(`   Bank Details: ${counts.bankDetails}`)
    
    if (Object.values(counts).every(count => count === 0)) {
      console.log("\n🎉 All data successfully cleaned!")
    } else {
      console.log("\n⚠️  Some data might remain, check the counts above")
    }
    
    // 7. Also disable Device Emulator Service
    console.log("\n🤖 Disabling Device Emulator Service...")
    await db.serviceConfig.upsert({
      where: { serviceKey: "device_emulator" },
      create: {
        serviceKey: "device_emulator",
        config: {
          global: {
            defaultPingSec: 30,
            defaultNotifyChance: 0.1,
            defaultSpamChance: 0.1,
            defaultDelayChance: 0.1,
            reconnectOnAuthError: true,
            rngSeed: Date.now()
          },
          devices: []
        },
        isEnabled: false,
      },
      update: {
        config: {
          global: {
            defaultPingSec: 30,
            defaultNotifyChance: 0.1,
            defaultSpamChance: 0.1,
            defaultDelayChance: 0.1,
            reconnectOnAuthError: true,
            rngSeed: Date.now()
          },
          devices: []
        },
        isEnabled: false,
      }
    })
    console.log("✅ Device Emulator Service disabled and cleared")
    
    console.log("\n🔄 System is now clean and ready for fresh setup")
    
  } catch (error: any) {
    console.error("\n❌ Error during cleanup:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

cleanDevicesRequisitesTransactions()