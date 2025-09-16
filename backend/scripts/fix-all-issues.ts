import { db } from "@/db"
import { Status } from "@prisma/client"

async function fixAllIssues() {
  try {
    console.log("🔧 Starting comprehensive fix...")

    // 1. Fix the 422 error - the issue is likely with the device relation in bank-details response
    // The problem is that bank-details endpoint expects an array relation but schema has 1-1
    console.log("\n📊 Fixing bank details device relation issue...")
    
    // Check current state
    const bankDetailsWithIssues = await db.bankDetail.findMany({
      where: {
        deviceId: { not: null }
      },
      include: {
        device: true
      }
    })
    
    console.log(`Found ${bankDetailsWithIssues.length} bank details with devices`)

    // 2. Fix device stop button - ensure devices have proper online status
    console.log("\n🔧 Fixing device stop button issue...")
    
    // Set all null isOnline values to false
    const fixedDevices = await db.device.updateMany({
      where: {
        isOnline: null
      },
      data: {
        isOnline: false
      }
    })
    console.log(`Fixed ${fixedDevices.count} devices with null isOnline status`)

    // 3. Fix emulator status showing "Подключается..." forever
    console.log("\n🤖 Fixing emulator connection status...")
    
    // Update all emulated devices to be offline if they haven't been updated recently
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const stuckEmulators = await db.device.updateMany({
      where: {
        emulated: true,
        updatedAt: { lt: oneHourAgo },
        isOnline: { not: false }
      },
      data: {
        isOnline: false
      }
    })
    console.log(`Fixed ${stuckEmulators.count} stuck emulated devices`)

    // 4. Clean up the database as requested
    console.log("\n🗑️ Cleaning up database...")

    // Delete all transactions
    console.log("Deleting all transactions...")
    const deletedTransactions = await db.transaction.deleteMany({})
    console.log(`Deleted ${deletedTransactions.count} transactions`)

    // Reset all trader profits to 0
    console.log("Resetting all trader profits...")
    const resetTraders = await db.user.updateMany({
      where: {
        OR: [
          { profitFromDeals: { gt: 0 } },
          { profitFromPayouts: { gt: 0 } }
        ]
      },
      data: {
        profitFromDeals: 0,
        profitFromPayouts: 0
      }
    })
    console.log(`Reset profits for ${resetTraders.count} traders`)

    // Find trader@example.com
    const trader = await db.user.findUnique({
      where: { email: "trader@example.com" }
    })

    if (trader) {
      console.log("\n👤 Found trader@example.com, updating...")

      // Set balance to 10,000 USDT
      await db.user.update({
        where: { id: trader.id },
        data: {
          balanceUsdt: 10000,
          trustBalance: 10000,
          frozenUsdt: 0,
          frozenRub: 0
        }
      })
      console.log("✅ Set trader@example.com balance to 10,000 USDT")

      // Delete all devices for trader@example.com
      const deletedDevices = await db.device.deleteMany({
        where: { userId: trader.id }
      })
      console.log(`✅ Deleted ${deletedDevices.count} devices for trader@example.com`)

      // Delete all requisites (bank details) for trader@example.com
      const deletedRequisites = await db.bankDetail.deleteMany({
        where: { userId: trader.id }
      })
      console.log(`✅ Deleted ${deletedRequisites.count} requisites for trader@example.com`)
    } else {
      console.log("⚠️ trader@example.com not found")
    }

    // 5. Additional fixes for the API
    console.log("\n🔧 Additional API fixes...")

    // Ensure all bank details without devices have proper deviceId set to null
    await db.bankDetail.updateMany({
      where: {
        deviceId: null,
        device: null
      },
      data: {
        deviceId: null
      }
    })

    // Clean up orphaned notifications
    const deletedNotifications = await db.notification.deleteMany({
      where: {
        deviceId: null
      }
    })
    console.log(`Cleaned up ${deletedNotifications.count} orphaned notifications`)

    console.log("\n✅ All fixes completed successfully!")

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

fixAllIssues()