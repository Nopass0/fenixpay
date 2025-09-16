import { db } from "@/db"
import { BankType, MethodType } from "@prisma/client"

async function createTestRequisiteAndDevice() {
  try {
    console.log("🔧 Creating test requisite and device...")

    // Find trader
    const trader = await db.user.findUnique({
      where: { email: "trader@example.com" }
    })

    if (!trader) {
      console.log("❌ trader@example.com not found")
      return
    }

    // 1. Create a device
    console.log("\n📱 Creating device...")
    const device = await db.device.create({
      data: {
        userId: trader.id,
        name: "Test Device",
        token: `test-device-${Date.now()}`,
        isOnline: true,
        energy: 85,
        ethernetSpeed: 100
      }
    })
    console.log("✅ Created device:", device.id, device.name)

    // 2. Create a bank detail (requisite)
    console.log("\n💳 Creating bank detail...")
    const bankDetail = await db.bankDetail.create({
      data: {
        userId: trader.id,
        methodType: MethodType.c2c,
        bankType: "SBERBANK" as BankType,
        cardNumber: "4111111111111111",
        recipientName: "Test Recipient",
        phoneNumber: "+71234567890",
        minAmount: 100,
        maxAmount: 10000,
        dailyLimit: 50000,
        monthlyLimit: 1000000,
        intervalMinutes: 5,
        deviceId: device.id
      }
    })
    console.log("✅ Created bank detail:", bankDetail.id)

    // 3. Test fetching bank details with device
    console.log("\n🔍 Testing bank detail with device...")
    const bdWithDevice = await db.bankDetail.findUnique({
      where: { id: bankDetail.id },
      include: { device: true }
    })
    
    console.log("Bank detail has device:", !!bdWithDevice?.device)
    console.log("Device info:", bdWithDevice?.device)

    // 4. Create an emulated device
    console.log("\n🤖 Creating emulated device...")
    const emulatedDevice = await db.device.create({
      data: {
        userId: trader.id,
        name: "Pixel 7 Pro (Emulated)",
        token: `emulator_${Date.now()}`,
        isOnline: true,
        emulated: true,
        energy: 90,
        ethernetSpeed: 150
      }
    })
    console.log("✅ Created emulated device:", emulatedDevice.id, emulatedDevice.name)

    // 5. Create another bank detail linked to emulated device
    const emulatedBankDetail = await db.bankDetail.create({
      data: {
        userId: trader.id,
        methodType: MethodType.c2c,
        bankType: "TBANK" as BankType,
        cardNumber: "5555555555554444",
        recipientName: "Emulated Recipient",
        phoneNumber: "+79876543210",
        minAmount: 500,
        maxAmount: 50000,
        dailyLimit: 100000,
        monthlyLimit: 2000000,
        intervalMinutes: 3,
        deviceId: emulatedDevice.id
      }
    })
    console.log("✅ Created bank detail for emulated device:", emulatedBankDetail.id)

    console.log("\n✅ Test data created successfully!")
    console.log("\nYou can now test:")
    console.log("1. The bank-details endpoint should return these requisites")
    console.log("2. The device stop button should work")
    console.log("3. The emulator status should show correctly")

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

createTestRequisiteAndDevice()