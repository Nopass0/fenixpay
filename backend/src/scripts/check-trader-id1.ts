import { db } from "../db";

async function checkTraderId1() {
  console.log("=== Проверка трейдера с ID 1 ===\n");

  // Проверяем пользователя с numericId = 1
  const userWithNumericId1 = await db.user.findFirst({
    where: { numericId: 1 },
    include: {
      bankDetails: {
        where: { isArchived: false }
      }
    }
  });

  if (userWithNumericId1) {
    console.log("Пользователь с numericId = 1:");
    console.log(`  Email: ${userWithNumericId1.email}`);
    console.log(`  ID: ${userWithNumericId1.id}`);
    console.log(`  Баланс: ${userWithNumericId1.trustBalance} USDT`);
    console.log(`  Заморожено: ${userWithNumericId1.frozenUsdt} USDT`);
    console.log(`  Депозит: ${userWithNumericId1.deposit}`);
    console.log(`  Команда: ${userWithNumericId1.teamId}`);
    console.log(`  Трафик включен: ${userWithNumericId1.trafficEnabled}`);
    console.log(`  Реквизитов: ${userWithNumericId1.bankDetails.length}`);
    
    // Проверяем транзакции
    const transactions = await db.transaction.count({
      where: { traderId: userWithNumericId1.id }
    });
    console.log(`  Транзакций: ${transactions}`);
  } else {
    console.log("Пользователь с numericId = 1 не найден!");
  }

  console.log("\n=== Все трейдеры с реквизитами ===");
  
  const tradersWithRequisites = await db.user.findMany({
    where: {
      bankDetails: {
        some: {
          isArchived: false
        }
      }
    },
    include: {
      bankDetails: {
        where: { isArchived: false }
      }
    }
  });

  for (const trader of tradersWithRequisites) {
    const txCount = await db.transaction.count({
      where: { traderId: trader.id }
    });
    
    console.log(`\nТрейдер ${trader.email} (numericId: ${trader.numericId}):`);
    console.log(`  ID: ${trader.id}`);
    console.log(`  Баланс: ${trader.trustBalance} USDT`);
    console.log(`  Депозит: ${trader.deposit}`);
    console.log(`  Команда: ${trader.teamId}`);
    console.log(`  Трафик включен: ${trader.trafficEnabled}`);
    console.log(`  Реквизитов: ${trader.bankDetails.length}`);
    console.log(`  Транзакций: ${txCount}`);
    
    if (trader.bankDetails.length > 0) {
      console.log(`  Реквизиты:`);
      for (const req of trader.bankDetails) {
        console.log(`    - ${req.cardNumber} (${req.bankType})`);
      }
    }
  }

  console.log("\n=== Условия для получения транзакций ===");
  console.log("Для того чтобы трейдер получал транзакции, должны выполняться условия:");
  console.log("1. deposit > 0");
  console.log("2. teamId != null");
  console.log("3. trafficEnabled = true");
  console.log("4. banned = false");
  console.log("5. Есть активные реквизиты (isArchived = false)");

  await db.$disconnect();
}

checkTraderId1().catch(console.error);