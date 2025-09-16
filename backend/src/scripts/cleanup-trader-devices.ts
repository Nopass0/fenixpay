import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupTraderDevices() {
  console.log("Starting cleanup of trader devices...");

  try {
    // Get all traders with their devices
    const traders = await prisma.user.findMany({
      include: {
        devices: {
          orderBy: {
            createdAt: 'desc' // Keep the newest device
          }
        }
      }
    });

    for (const trader of traders) {
      if (trader.devices.length > 1) {
        console.log(`\nTrader ${trader.email} has ${trader.devices.length} devices`);
        
        // Keep the first device (newest one)
        const deviceToKeep = trader.devices[0];
        const devicesToDelete = trader.devices.slice(1);

        console.log(`Keeping device: ${deviceToKeep.name} (ID: ${deviceToKeep.id})`);
        console.log(`Deleting ${devicesToDelete.length} devices:`, devicesToDelete.map(d => d.name));

        // Update all bank details to point to the device we're keeping
        const updateResult = await prisma.bankDetail.updateMany({
          where: {
            deviceId: {
              in: devicesToDelete.map(d => d.id)
            }
          },
          data: {
            deviceId: deviceToKeep.id
          }
        });
        console.log(`Updated ${updateResult.count} bank details to use the kept device`);

        // Delete the extra devices
        const deleteResult = await prisma.device.deleteMany({
          where: {
            id: {
              in: devicesToDelete.map(d => d.id)
            }
          }
        });
        console.log(`Deleted ${deleteResult.count} devices`);
      }
    }

    // Show final device count per trader
    console.log("\nFinal device count per trader:");
    const finalTraders = await prisma.user.findMany({
      include: {
        _count: {
          select: { devices: true }
        }
      },
      where: {
        devices: {
          some: {}
        }
      }
    });

    finalTraders.forEach(trader => {
      console.log(`- ${trader.email}: ${trader._count.devices} device(s)`);
    });

    console.log("\nCleanup completed successfully!");
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTraderDevices();