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

    // Get first device
    const device = await db.device.findFirst({
      where: { 
        userId: trader.id,
        emulated: false // Get a physical device
      }
    });

    if (!device) {
      console.error("No device found for trader");
      return;
    }

    console.log(`Creating bank details for device: ${device.name}`);

    // Create bank details
    const bankDetail = await db.bankDetail.create({
      data: {
        userId: trader.id,
        deviceId: device.id,
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

    console.log(`✅ Created bank details:`);
    console.log(`   Card: ${bankDetail.cardNumber}`);
    console.log(`   Bank: ${bankDetail.bankType}`);
    console.log(`   Recipient: ${bankDetail.recipientName}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();