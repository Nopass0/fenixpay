#!/usr/bin/env bun
import { db } from "../src/db";
import { PayoutStatus } from "@prisma/client";

async function generateTestPayouts() {
  console.log("🚀 Генерация тестовых выплат...");

  try {
    // Найдем тестового мерчанта
    const testMerchant = await db.merchant.findFirst({
      where: {
        name: {
          contains: "test",
          mode: 'insensitive'
        }
      }
    });

    if (!testMerchant) {
      console.error("❌ Тестовый мерчант не найден. Создайте пользователя с username 'test'");
      return;
    }

    // Найдем трейдеров
    const traders = await db.user.findMany({
      where: {
        role: 'TRADER'
      },
      take: 5
    });

    if (traders.length === 0) {
      console.error("❌ Трейдеры не найдены");
      return;
    }

    console.log(`✅ Найдено ${traders.length} трейдеров`);

    // Тестовые данные для выплат
    const payoutData = [
      { amount: 5000, wallet: "79001234567", bank: "Тинькофф", isCard: true },
      { amount: 10000, wallet: "79012345678", bank: "Сбербанк", isCard: true },
      { amount: 3500, wallet: "79023456789", bank: "ВТБ", isCard: true },
      { amount: 15000, wallet: "79034567890", bank: "Альфа-Банк", isCard: true },
      { amount: 8000, wallet: "79045678901", bank: "Газпромбанк", isCard: true },
      { amount: 2000, wallet: "79056789012", bank: "Тинькофф", isCard: true },
      { amount: 25000, wallet: "79067890123", bank: "Сбербанк", isCard: true },
      { amount: 4500, wallet: "79078901234", bank: "ВТБ", isCard: true },
      { amount: 12000, wallet: "79089012345", bank: "Альфа-Банк", isCard: true },
      { amount: 6000, wallet: "79090123456", bank: "Озон Банк", isCard: true }
    ];

    const createdPayouts = [];

    for (let i = 0; i < payoutData.length; i++) {
      const data = payoutData[i];
      const trader = traders[i % traders.length]; // Распределяем между трейдерами
      
      // Используем фиксированный курс 95 руб за USDT
      const rate = 95;
      const amountUsdt = data.amount / rate;
      const total = data.amount;
      const totalUsdt = amountUsdt;

      const payout = await db.payout.create({
        data: {
          merchantId: testMerchant.id,
          traderId: trader.id,
          amount: data.amount,
          amountUsdt: amountUsdt,
          total: total,
          totalUsdt: totalUsdt,
          rate: rate,
          wallet: data.wallet,
          bank: data.bank,
          isCard: data.isCard,
          currency: 'rub',
          status: i < 3 ? PayoutStatus.IN_PROGRESS : PayoutStatus.COMPLETED,
          completedAt: i < 3 ? null : new Date(),
          externalId: `test-${Date.now()}-${i}`,
          comment: `Тестовая выплата #${i + 1}`,
          fee: 0,
          feeUsdt: 0
        }
      });

      createdPayouts.push(payout);
      console.log(`✅ Создана выплата #${payout.numericId}: ${data.amount} руб → ${data.wallet} (${data.bank})`);
    }

    console.log(`\n✨ Успешно создано ${createdPayouts.length} тестовых выплат!`);
    console.log(`📊 Статистика:`);
    console.log(`- В процессе: 3 выплаты`);
    console.log(`- Завершено: 7 выплат`);
    console.log(`- Общая сумма: ${payoutData.reduce((sum, p) => sum + p.amount, 0).toLocaleString('ru-RU')} руб`);

  } catch (error) {
    console.error("❌ Ошибка при создании выплат:", error);
  } finally {
    await db.$disconnect();
  }
}

generateTestPayouts();