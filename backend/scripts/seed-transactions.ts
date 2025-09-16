import { db } from "../src/db";
import { Status, TransactionType, Currency } from "@prisma/client";
import { randomBytes } from "crypto";

// Список тестовых имен и фамилий
const firstNames = ["Александр", "Михаил", "Иван", "Дмитрий", "Андрей", "Сергей", "Владимир", "Николай", "Павел", "Алексей"];
const lastNames = ["Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов", "Михайлов", "Новиков"];
const cardNumbers = ["4276", "5536", "4279", "5469", "4255", "4301", "5211", "4272"];
const banks = ["Сбербанк", "Т-Банк", "ВТБ", "Альфа-банк", "Райффайзен", "Открытие"];

// Генерация случайной карты
function generateCardNumber() {
  const prefix = cardNumbers[Math.floor(Math.random() * cardNumbers.length)];
  return `${prefix} **** **** ${Math.floor(Math.random() * 9000) + 1000}`;
}

// Генерация случайного имени
function generateFullName() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

// Генерация случайной суммы от 100 до 50000
function generateAmount() {
  return Math.floor(Math.random() * 49900) + 100;
}

// Генерация случайного банка
function generateBank() {
  return banks[Math.floor(Math.random() * banks.length)];
}

async function seedTransactions() {
  try {
    console.log("🌱 Starting seed process...");

    // Проверяем, есть ли мерчант
    let merchant = await db.merchant.findFirst({
      where: { name: "Test Merchant" }
    });

    // Если нет, создаем
    if (!merchant) {
      console.log("📦 Creating test merchant...");
      merchant = await db.merchant.create({
        data: {
          id: "test-merchant-" + randomBytes(8).toString("hex"),
          name: "Test Merchant",
          token: randomBytes(16).toString("hex"),
          disabled: false,
          banned: false,
          balanceUsdt: 10000
        }
      });
      console.log("✅ Test merchant created:", merchant.name);
    } else {
      console.log("✅ Test merchant already exists:", merchant.name);
    }

    // Получаем первого трейдера
    const trader = await db.user.findFirst();
    if (!trader) {
      console.error("❌ No trader found in database. Please create a trader first.");
      process.exit(1);
    }

    // Получаем или создаем метод CARD
    let method = await db.method.findFirst({
      where: { code: "CARD" }
    });

    if (!method) {
      console.log("📦 Creating CARD method...");
      method = await db.method.create({
        data: {
          code: "CARD",
          name: "Банковская карта",
          type: "c2c",
          currency: Currency.rub,
          commissionPayin: 2.5,
          commissionPayout: 2.5,
          maxPayin: 100000,
          minPayin: 100,
          maxPayout: 100000,
          minPayout: 100,
          chancePayin: 90,
          chancePayout: 90,
          isEnabled: true,
          rateSource: "bybit"
        }
      });
      console.log("✅ CARD method created");
    }

    console.log(`📊 Creating 100 IN transactions for trader: ${trader.email}`);

    // Создаем 100 транзакций
    const transactions = [];
    const now = new Date();

    for (let i = 0; i < 100; i++) {
      // Случайная дата за последние 30 дней
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      // Случайный статус (большинство READY)
      const statusRandom = Math.random();
      let status: Status;
      if (statusRandom < 0.7) {
        status = Status.READY;
      } else if (statusRandom < 0.85) {
        status = Status.CREATED;
      } else if (statusRandom < 0.95) {
        status = Status.IN_PROGRESS;
      } else {
        status = Status.EXPIRED;
      }

      const amount = generateAmount();
      const commission = Math.floor(amount * 0.025); // 2.5% комиссия

      const transaction = {
        merchantId: merchant.id,
        traderId: trader.id,
        amount: amount,
        assetOrBank: generateBank(),
        orderId: `ORDER-${Date.now()}-${i}`,
        methodId: method.id,
        currency: "RUB",
        userId: `user-${Math.random().toString(36).substring(7)}`,
        userIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
        callbackUri: "https://example.com/callback",
        successUri: "https://example.com/success",
        failUri: "https://example.com/fail",
        type: TransactionType.IN,
        expired_at: new Date(createdAt.getTime() + 30 * 60 * 1000), // 30 минут после создания
        commission: commission,
        clientName: generateFullName(),
        status: status,
        rate: 85 + Math.random() * 10, // Курс от 85 до 95
        isMock: false,
        createdAt: createdAt,
        updatedAt: createdAt,
        acceptedAt: status === Status.READY ? new Date(createdAt.getTime() + Math.random() * 20 * 60 * 1000) : null
      };

      transactions.push(transaction);
    }

    // Вставляем транзакции батчами по 10
    console.log("💾 Inserting transactions...");
    for (let i = 0; i < transactions.length; i += 10) {
      const batch = transactions.slice(i, i + 10);
      await db.transaction.createMany({
        data: batch
      });
      console.log(`✅ Inserted ${i + batch.length} / ${transactions.length} transactions`);
    }

    console.log("🎉 Seed completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - Merchant: ${merchant.name}`);
    console.log(`   - Trader: ${trader.email}`);
    console.log(`   - Transactions: ${transactions.length}`);

  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Запускаем seed
seedTransactions();