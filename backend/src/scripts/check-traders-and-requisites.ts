import { db } from "../db";

async function checkTradersAndRequisites() {
  console.log("=== Проверка трейдеров и реквизитов ===\n");

  // Получаем всех пользователей
  const allUsers = await db.user.findMany({
    include: {
      bankDetails: {
        where: { isArchived: false }
      }
    },
    orderBy: { numericId: "asc" }
  });

  console.log(`Всего пользователей: ${allUsers.length}\n`);
  
  // Фильтруем трейдеров (те, у кого есть реквизиты)
  const traders = allUsers.filter(u => u.bankDetails.length > 0);

  console.log(`Найдено трейдеров: ${traders.length}\n`);

  for (const trader of traders) {
    console.log(`Трейдер ${trader.numericId}:`);
    console.log(`  Email: ${trader.email}`);
    console.log(`  ID: ${trader.id}`);
    console.log(`  Баланс: ${trader.trustBalance} USDT`);
    console.log(`  Заморожено: ${trader.frozenUsdt} USDT`);
    console.log(`  Депозит: ${trader.deposit}`);
    console.log(`  Команда: ${trader.teamId}`);
    console.log(`  Трафик включен: ${trader.trafficEnabled}`);
    console.log(`  Реквизитов: ${trader.bankDetails.length}`);
    
    if (trader.bankDetails.length > 0) {
      console.log(`  Реквизиты:`);
      for (const req of trader.bankDetails) {
        console.log(`    - ${req.cardNumber} (${req.bankType}) [ID: ${req.id}]`);
        console.log(`      Обновлен: ${req.updatedAt.toISOString()}`);
      }
    }
    console.log("");
  }

  // Проверяем распределение транзакций
  console.log("\n=== Тестовый мерчант ===");
  const testMerchant = await db.merchant.findFirst({
    where: { name: { equals: "test", mode: "insensitive" } }
  });

  if (testMerchant) {
    console.log(`Найден тестовый мерчант: ${testMerchant.name} (ID: ${testMerchant.id})`);
  } else {
    console.log("Тестовый мерчант не найден");
  }

  await db.$disconnect();
}

checkTradersAndRequisites().catch(console.error);