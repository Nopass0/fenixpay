import { db } from "../db";
import { NotificationType, Status, TransactionType, BankType, MethodType } from "@prisma/client";

async function createSimpleTest() {
  console.log("🚀 Starting simplified notification matching test...\n");
  
  // 1. Find test trader
  const trader = await db.user.findFirst({
    where: { email: "trader@test.com" }
  });

  if (!trader) {
    console.error("❌ Test trader not found");
    return;
  }

  // 2. Get or create a device
  let device = await db.device.findFirst({
    where: { userId: trader.id }
  });

  if (!device) {
    device = await db.device.create({
      data: {
        name: "Test Device",
        userId: trader.id,
        token: `test-device-${Date.now()}`,
        emulated: true,
        isOnline: true,
        isWorking: true,
        pushEnabled: true
      }
    });
    console.log(`✅ Created device: ${device.id}`);
  } else {
    console.log(`✅ Using existing device: ${device.id}`);
  }

  // 3. Get or create bank details
  let bankDetail = await db.bankDetail.findFirst({
    where: { 
      deviceId: device.id,
      bankType: BankType.SBERBANK
    }
  });

  if (!bankDetail) {
    bankDetail = await db.bankDetail.create({
      data: {
        cardNumber: "4276380012345678",
        recipientName: "IVAN IVANOV",
        bankType: BankType.SBERBANK,
        methodType: MethodType.c2c,
        minAmount: 100,
        maxAmount: 100000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        userId: trader.id,
        deviceId: device.id
      }
    });
    console.log(`✅ Created bank detail: ${bankDetail.bankType}`);
  } else {
    console.log(`✅ Using existing bank detail: ${bankDetail.bankType}`);
  }

  // 4. Get merchant and method
  const merchant = await db.merchant.findFirst({
    where: { name: "Test Merchant" }
  });
  
  const method = await db.method.findFirst({
    where: { code: "c2c" }
  });

  if (!merchant || !method) {
    console.error("❌ Test merchant or method not found");
    return;
  }

  // 5. Create transactions directly
  console.log("\n📝 Creating test transactions...");
  const amounts = [1000, 2500, 5000];
  const transactions = [];

  for (let i = 0; i < amounts.length; i++) {
    const tx = await db.transaction.create({
      data: {
        orderId: `TEST-${Date.now()}-${i}`,
        merchantId: merchant.id,
        userId: trader.id,
        traderId: trader.id,
        bankDetailId: bankDetail.id,
        methodId: method.id,
        amount: amounts[i],
        assetOrBank: "RUB",
        status: Status.CREATED,
        type: TransactionType.IN,
        callbackUri: "https://webhook.site/test-callback",
        successUri: "https://test.com/success",
        failUri: "https://test.com/fail",
        expired_at: new Date(Date.now() + 30 * 60 * 1000),
        commission: 0,
        clientName: "Test Client"
      }
    });

    transactions.push(tx);
    console.log(`✅ Created transaction: ${tx.amount} RUB`);
  }

  // 6. Send test notifications
  console.log("\n📱 Sending test notifications...");
  
  const notifications = [
    {
      message: "Пополнение счета на 1000 ₽ от Иван И.",
      amount: 1000
    },
    {
      message: "Перевод на 2500 ₽ от Петров П.П.",
      amount: 2500
    },
    {
      message: "Зачисление 5000 ₽ на счет *5678",
      amount: 5000
    }
  ];

  for (const notif of notifications) {
    await db.notification.create({
      data: {
        Device: {
          connect: { id: device.id }
        },
        type: NotificationType.AppNotification,
        application: "ru.sberbankmobile",
        packageName: "ru.sberbankmobile",
        title: "Сбербанк",
        message: notif.message,
        isRead: false,
        metadata: {
          packageName: "ru.sberbankmobile",
          expectedAmount: notif.amount
        }
      }
    });
    console.log(`📨 Sent: ${notif.message}`);
  }

  // 7. Start NotificationMatcherService if not running
  console.log("\n⏳ Waiting 10 seconds for NotificationMatcherService to process...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 8. Check results
  console.log("\n🔍 Checking transaction statuses...");
  for (const tx of transactions) {
    const updated = await db.transaction.findUnique({
      where: { id: tx.id }
    });
    console.log(`Transaction ${updated!.amount} RUB: ${updated!.status}`);
  }

  console.log("\n✅ Test completed!");
}

createSimpleTest()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
  });