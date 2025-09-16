#!/usr/bin/env bun
import { db } from "../src/db";
import bcrypt from "bcrypt";

async function createTestUsers() {
  console.log("🚀 Создание тестовых пользователей для выплат...");

  try {
    // Создадим тестового мерчанта если его нет
    let testMerchant = await db.merchant.findFirst({
      where: {
        name: {
          contains: "test",
          mode: 'insensitive'
        }
      }
    });

    if (!testMerchant) {
      console.log("📝 Создаем тестового мерчанта...");
      
      // Сначала создадим пользователя для мерчанта
      const merchantUser = await db.user.create({
        data: {
          username: "test_merchant",
          password: await bcrypt.hash("password123", 10),
          role: "MERCHANT"
        }
      });

      testMerchant = await db.merchant.create({
        data: {
          id: merchantUser.id,
          name: "Test Merchant",
          token: `test_merchant_${Date.now()}`,
          balanceUsdt: 100000
        }
      });

      console.log("✅ Создан тестовый мерчант:", testMerchant.name);
    } else {
      console.log("✅ Тестовый мерчант уже существует:", testMerchant.name);
    }

    // Создадим трейдеров если их мало
    const existingTraders = await db.user.count({
      where: { role: 'TRADER' }
    });

    if (existingTraders < 5) {
      console.log(`📝 Создаем ${5 - existingTraders} трейдеров...`);
      
      for (let i = existingTraders; i < 5; i++) {
        const trader = await db.user.create({
          data: {
            username: `trader${i + 1}`,
            password: await bcrypt.hash("password123", 10),
            role: "TRADER"
          }
        });

        console.log(`✅ Создан трейдер: ${trader.username}`);
      }
    } else {
      console.log("✅ Достаточное количество трейдеров уже существует");
    }

    console.log("\n✨ Все готово для создания тестовых выплат!");
    console.log("Теперь можно запустить: bun run scripts/generate-test-payouts.ts");

  } catch (error) {
    console.error("❌ Ошибка:", error);
  } finally {
    await db.$disconnect();
  }
}

createTestUsers();