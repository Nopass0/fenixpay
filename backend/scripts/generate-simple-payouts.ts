#!/usr/bin/env bun
import { db } from "../src/db";
import { PayoutStatus } from "@prisma/client";

async function generateSimplePayouts() {
  console.log("🚀 Генерация тестовых выплат...");

  try {
    // Найдем любого мерчанта
    const merchant = await db.merchant.findFirst();
    
    if (!merchant) {
      console.error("❌ Мерчанты не найдены");
      return;
    }

    console.log(`✅ Используем мерчанта: ${merchant.name}`);

    // Найдем любых пользователей (трейдеров)
    const users = await db.user.findMany({
      take: 5,
      where: {
        balanceRub: {
          gte: 0
        }
      }
    });

    if (users.length === 0) {
      console.error("❌ Пользователи не найдены");
      return;
    }

    console.log(`✅ Найдено ${users.length} пользователей`);

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
      const user = users[i % users.length]; // Распределяем между пользователями
      
      // Используем фиксированный курс 95 руб за USDT
      const rate = 95;
      const amountUsdt = data.amount / rate;
      const total = data.amount;
      const totalUsdt = amountUsdt;

      const payout = await db.payout.create({
        data: {
          merchantId: merchant.id,
          traderId: null, // Не назначаем трейдера сразу
          amount: data.amount,
          amountUsdt: amountUsdt,
          total: total,
          totalUsdt: totalUsdt,
          rate: rate,
          wallet: data.wallet,
          bank: data.bank,
          isCard: data.isCard,
          status: PayoutStatus.CREATED, // Все выплаты создаем в статусе CREATED
          processingTime: 30, // 30 минут на обработку
          expireAt: new Date(Date.now() + 30 * 60 * 1000) // Истекает через 30 минут
        }
      });

      createdPayouts.push(payout);
      console.log(`✅ Создана выплата #${payout.numericId}: ${data.amount} руб → ${data.wallet} (${data.bank})`);
    }

    console.log(`\n✨ Успешно создано ${createdPayouts.length} тестовых выплат!`);
    console.log(`📊 Статистика:`);
    console.log(`- Все выплаты в статусе CREATED (доступны для принятия)`);
    console.log(`- Время на принятие: 30 минут`);
    console.log(`- Общая сумма: ${payoutData.reduce((sum, p) => sum + p.amount, 0).toLocaleString('ru-RU')} руб`);

  } catch (error) {
    console.error("❌ Ошибка при создании выплат:", error);
  } finally {
    await db.$disconnect();
  }
}

generateSimplePayouts();