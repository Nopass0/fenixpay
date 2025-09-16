import { db } from "../src/db";

async function main() {
  try {
    // Find the test trader
    const trader = await db.user.findFirst({
      where: { 
        email: "trader@test.com"
      }
    });

    if (!trader) {
      console.error("Trader trader@test.com not found");
      return;
    }

    console.log(`Found trader: ${trader.email} (ID: ${trader.id})`);

    // Check devices for this trader
    const devices = await db.device.findMany({
      where: {
        userId: trader.id
      },
      include: {
        bankDetails: true
      }
    });

    console.log(`\n📱 Devices for trader: ${devices.length}`);
    
    if (devices.length === 0) {
      console.log("No devices found. Creating test devices...");
      
      // Create test devices
      const testDevices = [
        {
          userId: trader.id,
          name: "iPhone 12 Pro",
          token: `device-token-${Date.now()}-1`,
          isOnline: true,
          emulated: false,
          lastActiveAt: new Date()
        },
        {
          userId: trader.id,
          name: "Samsung Galaxy S21",
          token: `device-token-${Date.now()}-2`,
          isOnline: false,
          emulated: false,
          lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          userId: trader.id,
          name: "Test Emulator",
          token: `device-token-${Date.now()}-3`,
          isOnline: true,
          emulated: true,
          lastActiveAt: new Date()
        }
      ];

      for (const deviceData of testDevices) {
        const device = await db.device.create({
          data: deviceData
        });
        console.log(`✅ Created device: ${device.name} (${device.isOnline ? 'Online' : 'Offline'})`);
      }

      // Create bank details for the first device
      const firstDevice = await db.device.findFirst({
        where: { userId: trader.id }
      });

      if (firstDevice) {
        const bankDetails = await db.bankDetail.create({
          data: {
            userId: trader.id,
            deviceId: firstDevice.id,
            methodType: "c2c",
            bankType: "TBANK",
            cardNumber: "5536913853214567",
            recipientName: "Иван Иванов",
            phoneNumber: "+79123456789",
            minAmount: 100,
            maxAmount: 100000,
            dailyLimit: 500000,
            monthlyLimit: 5000000,
            isArchived: false
          }
        });
        console.log(`✅ Created bank details for device: ${firstDevice.name}`);
      }
    } else {
      devices.forEach(device => {
        console.log(`  - ${device.name} (${device.isOnline ? '🟢 Online' : '🔴 Offline'}) - ${device.emulated ? 'Emulated' : 'Physical'}`);
        console.log(`    Token: ${device.token}`);
        console.log(`    Last active: ${device.lastActiveAt || 'Never'}`);
        console.log(`    Bank details: ${device.bankDetails.length}`);
      });
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();