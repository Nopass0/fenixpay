#!/usr/bin/env bun
import { db } from "../db";
import { faker } from "@faker-js/faker";
import { sha256 } from "@/utils/hash";
import { 
  Status, 
  PayoutStatus, 
  Currency, 
  WithdrawalDisputeStatus,
  DealDisputeStatus,
  DisputeSenderType,
  MessageType,
  MessagePriority
} from "@prisma/client";

async function main() {
  console.log("🚀 Creating test traders with comprehensive data...");

  try {

    // Create test method if not exists
    let testMethod = await db.method.findFirst({
      where: { code: "TEST_C2C" }
    });

    if (!testMethod) {
      testMethod = await db.method.create({
        data: {
          code: "TEST_C2C",
          name: "Test C2C Method",
          type: "c2c",
          commissionPayin: 1.5,
          commissionPayout: 2,
          maxPayin: 1000000,
          minPayin: 100,
          maxPayout: 500000,
          minPayout: 500,
          chancePayin: 95,
          chancePayout: 95,
        }
      });
    }

    // Create test merchant
    const testMerchant = await db.merchant.create({
      data: {
        name: "Test Merchant for Traders",
        token: `test-merchant-${faker.string.alphanumeric(20)}`,
        disabled: false,
        banned: false,
      }
    });

    console.log(`✅ Created merchant: ${testMerchant.name}`);

    // 1. Create trader with small balance
    const smallBalanceTrader = await db.user.create({
      data: {
        email: "small-balance@test.com",
        password: await sha256("Test123!"),
        name: "Small Balance Trader",
        balanceUsdt: 100,
        balanceRub: 5000, // Small RUB balance
        payoutBalance: 150, // Small payout balance
        frozenRub: 1000,
        frozenUsdt: 10,
        profitFromDeals: 20,
        profitFromPayouts: 15,
        trafficEnabled: true,
        maxSimultaneousPayouts: 3,
        traderMerchants: {
          create: {
            merchantId: testMerchant.id,
            methodId: testMethod.id,
            isMerchantEnabled: true,
          }
        }
      }
    });

    console.log(`✅ Created trader with small balance: ${smallBalanceTrader.email}`);

    // 2. Create trader with large payout balance
    const largeBalanceTrader = await db.user.create({
      data: {
        email: "large-balance@test.com",
        password: await sha256("Test123!"),
        name: "Large Balance Trader",
        balanceUsdt: 50000,
        balanceRub: 2500000, // 2.5M RUB
        payoutBalance: 100000, // Large payout balance
        frozenRub: 50000,
        frozenUsdt: 500,
        profitFromDeals: 5000,
        profitFromPayouts: 8000,
        trafficEnabled: true,
        maxSimultaneousPayouts: 10,
        traderMerchants: {
          create: {
            merchantId: testMerchant.id,
            methodId: testMethod.id,
            isMerchantEnabled: true,
          }
        }
      }
    });

    console.log(`✅ Created trader with large balance: ${largeBalanceTrader.email}`);

    // Create folders for both traders
    const folders = ["Personal", "Business", "Savings", "Crypto"];
    for (const trader of [smallBalanceTrader, largeBalanceTrader]) {
      for (const folderName of folders) {
        await db.folder.create({
          data: {
            title: folderName,
            traderId: trader.id,
          }
        });
      }
    }

    console.log(`✅ Created folders for traders`);

    // Create devices for both traders
    const deviceNames = ["Samsung Galaxy S23", "iPhone 14 Pro", "Xiaomi Mi 11", "Google Pixel 7"];
    
    for (const trader of [smallBalanceTrader, largeBalanceTrader]) {
      for (let i = 0; i < 3; i++) {
        const device = await db.device.create({
          data: {
            userId: trader.id,
            name: faker.helpers.arrayElement(deviceNames),
            isOnline: i === 0, // First device is online
            lastActiveAt: faker.date.recent({ days: i === 0 ? 0 : 7 }),
            token: faker.string.alphanumeric(64),
            fcmToken: faker.string.alphanumeric(152),
            webPushEndpoint: faker.internet.url(),
            webPushP256dh: faker.string.alphanumeric(87),
            webPushAuth: faker.string.alphanumeric(24),
            pushEnabled: true,
            emulated: true,
            energy: faker.number.float({ min: 0.2, max: 1.0, fractionDigits: 2 }),
            ethernetSpeed: faker.number.float({ min: 10, max: 1000, fractionDigits: 1 }),
          }
        });
      }
    }

    console.log(`✅ Created devices`);

    // Create requisites (bank details)
    const bankTypes = ["SBERBANK", "TINKOFF", "VTB", "ALFA", "RAIFFEISEN"];
    
    for (const trader of [smallBalanceTrader, largeBalanceTrader]) {
      // Get trader's devices
      const devices = await db.device.findMany({
        where: { userId: trader.id }
      });

      for (let i = 0; i < 5; i++) {
        await db.bankDetail.create({
          data: {
            userId: trader.id,
            methodType: testMethod.type as any,
            bankType: faker.helpers.arrayElement(bankTypes) as any,
            cardNumber: faker.finance.creditCardNumber('#### #### #### ####'),
            recipientName: trader.name,
            phoneNumber: faker.phone.number('+7##########'),
            minAmount: 100,
            maxAmount: trader === smallBalanceTrader ? 50000 : 500000,
            dailyLimit: faker.number.int({ min: 100000, max: 1000000 }),
            monthlyLimit: faker.number.int({ min: 5000000, max: 20000000 }),
            maxCountTransactions: faker.number.int({ min: 10, max: 50 }),
            intervalMinutes: faker.number.int({ min: 0, max: 5 }),
            isArchived: i >= 3, // Last 2 are archived
            deviceId: devices[i % devices.length]?.id,
          }
        });
      }
    }

    console.log(`✅ Created payment details (requisites)`);

    // Create various payouts with different statuses
    const payoutStatuses: PayoutStatus[] = [
      PayoutStatus.CREATED,
      PayoutStatus.ACTIVE,
      PayoutStatus.CHECKING,
      PayoutStatus.COMPLETED,
      PayoutStatus.DISPUTE,
      PayoutStatus.EXPIRED,
      PayoutStatus.TRASH
    ];

    for (const trader of [smallBalanceTrader, largeBalanceTrader]) {
      // Create 20 payouts with various statuses
      for (let i = 0; i < 20; i++) {
        const status = faker.helpers.arrayElement(payoutStatuses);
        const amount = trader === smallBalanceTrader 
          ? faker.number.int({ min: 1000, max: 10000 })
          : faker.number.int({ min: 10000, max: 200000 });
        
        const rate = faker.number.int({ min: 95, max: 105 });
        const fee = faker.number.float({ min: 1, max: 3, fractionDigits: 2 });
        const total = amount + (amount * fee / 100);
        const totalUsdt = total / rate;

        const payout = await db.payout.create({
          data: {
            merchantId: testMerchant.id,
            traderId: status === PayoutStatus.CREATED ? null : trader.id,
            amount,
            amountUsdt: amount / rate,
            total,
            totalUsdt,
            fee,
            rate,
            merchantRate: rate,
            wallet: faker.finance.creditCardNumber('############'),
            bank: faker.helpers.arrayElement(bankTypes),
            isCard: true,
            status,
            direction: "OUT",
            acceptanceTime: faker.number.int({ min: 5, max: 30 }),
            processingTime: faker.number.int({ min: 15, max: 60 }),
            expireAt: status === PayoutStatus.CREATED 
              ? faker.date.future({ years: 0, refDate: new Date() })
              : faker.date.past({ years: 0, refDate: new Date() }),
            acceptedAt: status !== PayoutStatus.CREATED ? faker.date.past({ years: 0, refDate: new Date() }) : null,
            confirmedAt: [PayoutStatus.CHECKING, PayoutStatus.COMPLETED, PayoutStatus.DISPUTE].includes(status) 
              ? faker.date.past({ years: 0, refDate: new Date() }) : null,
            completedAt: status === PayoutStatus.COMPLETED ? faker.date.past({ years: 0, refDate: new Date() }) : null,
            externalReference: `EXT-${faker.string.alphanumeric(10)}`,
            proofFiles: [PayoutStatus.CHECKING, PayoutStatus.COMPLETED, PayoutStatus.DISPUTE].includes(status)
              ? [`https://example.com/proof/${faker.string.uuid()}.jpg`]
              : [],
            sumToWriteOffUSDT: status !== PayoutStatus.CREATED ? totalUsdt : null,
          }
        });

        // Create disputes for some payouts
        if (status === PayoutStatus.DISPUTE) {
          await db.withdrawalDispute.create({
            data: {
              payoutId: payout.id,
              senderType: DisputeSenderType.TRADER,
              message: faker.lorem.sentence(),
              files: [`https://example.com/dispute/${faker.string.uuid()}.jpg`],
              status: faker.helpers.arrayElement([
                WithdrawalDisputeStatus.OPEN,
                WithdrawalDisputeStatus.IN_PROGRESS,
                WithdrawalDisputeStatus.RESOLVED_SUCCESS,
                WithdrawalDisputeStatus.RESOLVED_FAIL
              ]),
              metadata: {
                reason: faker.helpers.arrayElement(["not_received", "wrong_amount", "technical_issue"]),
              }
            }
          });
        }
      }
    }

    console.log(`✅ Created payouts with various statuses and disputes`);

    // Create deals (transactions) with different statuses
    const transactionStatuses: Status[] = [
      Status.CREATED,
      Status.IN_PROGRESS,
      Status.READY,
      Status.DISPUTE,
      Status.CANCELED,
      Status.EXPIRED
    ];

    for (const trader of [smallBalanceTrader, largeBalanceTrader]) {
      // Create regular deals
      for (let i = 0; i < 15; i++) {
        const status = faker.helpers.arrayElement(transactionStatuses);
        const amount = trader === smallBalanceTrader 
          ? faker.number.int({ min: 500, max: 5000 })
          : faker.number.int({ min: 5000, max: 100000 });
        
        const rate = faker.number.int({ min: 95, max: 105 });
        const commission = amount * 0.015; // 1.5% commission

        const transaction = await db.transaction.create({
          data: {
            merchantId: testMerchant.id,
            traderId: trader.id,
            methodId: testMethod.id,
            amount,
            assetOrBank: faker.helpers.arrayElement(bankTypes),
            orderId: `ORDER-${faker.string.alphanumeric(10)}`,
            commission,
            currency: "RUB",
            rate,
            userId: trader.id,
            userIp: faker.internet.ip(),
            callbackUri: "https://callback.test/webhook",
            successUri: "https://callback.test/success",
            failUri: "https://callback.test/fail",
            clientName: faker.person.fullName(),
            status,
            acceptedAt: status !== Status.CREATED ? faker.date.past({ years: 0, refDate: new Date() }) : null,
            type: "IN",
            expired_at: faker.date.future({ years: 0, refDate: new Date() }),
          }
        });

        // Create disputes for some deals
        if (status === Status.DISPUTE) {
          await db.dealDispute.create({
            data: {
              transactionId: transaction.id,
              senderType: DisputeSenderType.TRADER,
              message: faker.lorem.sentences(2),
              files: [
                `https://example.com/deal-dispute/${faker.string.uuid()}.jpg`,
                `https://example.com/deal-dispute/${faker.string.uuid()}.pdf`
              ],
              status: faker.helpers.arrayElement([
                DealDisputeStatus.OPEN,
                DealDisputeStatus.IN_PROGRESS,
                DealDisputeStatus.RESOLVED_SUCCESS
              ]),
              metadata: {
                disputeReason: faker.helpers.arrayElement(["wrong_amount", "not_credited", "duplicate"]),
                resolution: faker.lorem.sentence(),
              }
            }
          });
        }
      }

      // Create in-progress deals expiring in 4 hours
      for (let i = 0; i < 5; i++) {
        const expireTime = new Date();
        expireTime.setHours(expireTime.getHours() + 4);

        const txAmount = faker.number.int({ min: 10000, max: 50000 });
        await db.transaction.create({
          data: {
            merchantId: testMerchant.id,
            traderId: trader.id,
            methodId: testMethod.id,
            amount: txAmount,
            assetOrBank: faker.helpers.arrayElement(bankTypes),
            orderId: `INPROG-${faker.string.alphanumeric(10)}`,
            commission: txAmount * 0.015,
            currency: "RUB",
            rate: faker.number.int({ min: 95, max: 105 }),
            userId: trader.id,
            userIp: faker.internet.ip(),
            callbackUri: "https://callback.test/webhook",
            successUri: "https://callback.test/success",
            failUri: "https://callback.test/fail",
            clientName: faker.person.fullName(),
            status: Status.IN_PROGRESS,
            type: "IN",
            expired_at: expireTime,
            acceptedAt: faker.date.recent({ days: 1 }),
          }
        });
      }
    }

    console.log(`✅ Created deals with various statuses and disputes`);

    // Create notifications for traders
    for (const trader of [smallBalanceTrader, largeBalanceTrader]) {
      // Create various types of notifications
      const notificationTypes = [
        { type: MessageType.DEAL_CREATED, subject: "New deal created", content: "You have a new deal #12345" },
        { type: MessageType.DEAL_COMPLETED, subject: "Deal completed", content: "Deal #12345 has been completed successfully" },
        { type: MessageType.PAYOUT_CREATED, subject: "New payout", content: "New payout request #67890" },
        { type: MessageType.PAYOUT_COMPLETED, subject: "Payout completed", content: "Payout #67890 has been completed" },
        { type: MessageType.DISPUTE_CREATED, subject: "Dispute opened", content: "A dispute has been opened for transaction #11111" },
        { type: MessageType.SYSTEM, subject: "System maintenance", content: "System maintenance scheduled for tonight" },
      ];

      for (const notif of notificationTypes) {
        await db.message.create({
          data: {
            traderId: trader.id,
            type: notif.type,
            priority: faker.helpers.arrayElement([MessagePriority.NORMAL, MessagePriority.HIGH, MessagePriority.URGENT]),
            subject: notif.subject,
            content: notif.content,
            isRead: faker.datatype.boolean(),
            metadata: {
              icon: faker.helpers.arrayElement(["info", "success", "warning", "error"]),
              actionUrl: faker.internet.url(),
            }
          }
        });
      }
    }

    console.log(`✅ Created notifications for traders`);


    console.log(`
🎉 Test data created successfully!

Traders created:
1. Small Balance Trader
   - Email: small-balance@test.com
   - Password: Test123!
   - RUB Balance: 5,000
   - USDT Balance: 100
   - Payout Balance: 150

2. Large Balance Trader
   - Email: large-balance@test.com  
   - Password: Test123!
   - RUB Balance: 2,500,000
   - USDT Balance: 50,000
   - Payout Balance: 100,000

Both traders have:
- Multiple devices with health checks
- Payment requisites (cards)
- Folders for organizing transactions
- Various payouts (completed, in progress, disputed)
- Various deals (completed, in progress, disputed)
- In-progress deals expiring in 4 hours
- Notifications

Merchant created:
- Name: ${testMerchant.name}
- Token: ${testMerchant.token}
`);

  } catch (error) {
    console.error("❌ Error creating test data:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();