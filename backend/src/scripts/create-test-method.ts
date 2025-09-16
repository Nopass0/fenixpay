import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function createTestMethod() {
  console.log("=== Создание тестового метода для Chase ===\n");

  try {
    // Проверяем, существует ли метод
    const existingMethod = await db.method.findUnique({
      where: { id: "cmdrc7j3b0004toztxn8l7kl0" }
    });

    if (existingMethod) {
      console.log("Метод уже существует:", existingMethod.name);
      console.log("Тип:", existingMethod.type);
      return;
    }

    // Создаем новый метод C2C
    const method = await db.method.create({
      data: {
        id: "cmdrc7j3b0004toztxn8l7kl0",
        name: "Sberbank C2C",
        type: "card", // 'card' type for C2C methods
        methodBank: "sberbank",
        isActive: true,
        minAmount: 100,
        maxAmount: 1000000,
        fee: 0,
        merchantId: null // Global method, not tied to specific merchant
      }
    });

    console.log("✅ Метод успешно создан!");
    console.log("ID:", method.id);
    console.log("Название:", method.name);
    console.log("Тип:", method.type);
    console.log("Банк:", method.methodBank);

  } catch (error) {
    console.error("❌ Ошибка при создании метода:", error);
  } finally {
    await db.$disconnect();
  }
}

createTestMethod().catch(console.error);