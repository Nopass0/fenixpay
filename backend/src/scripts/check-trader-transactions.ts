import { db } from "../db";

async function checkTraderTransactions() {
  console.log("=== Проверка транзакций трейдера ===\n");

  // Проверяем трейдера с numericId = 1
  const trader = await db.user.findFirst({
    where: { 
      numericId: 1
    },
    include: {
      bankDetails: {
        where: { isArchived: false }
      }
    }
  });

  if (!trader) {
    console.error("Трейдер не найден!");
    return;
  }

  console.log(`Трейдер: ${trader.email}`);
  console.log(`ID: ${trader.id}`);
  console.log(`Баланс: ${trader.trustBalance} USDT`);
  console.log(`Заморожено: ${trader.frozenUsdt} USDT`);
  console.log(`Реквизитов: ${trader.bankDetails.length}\n`);

  // Проверяем транзакции
  const recentTransactions = await db.transaction.findMany({
    where: {
      traderId: trader.id
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      requisites: true
    }
  });

  console.log(`\nПоследние транзакции (всего найдено: ${recentTransactions.length}):`);
  
  for (const tx of recentTransactions) {
    console.log(`\nТранзакция ${tx.id}:`);
    console.log(`  Создана: ${tx.createdAt.toISOString()}`);
    console.log(`  Сумма: ${tx.amount} RUB`);
    console.log(`  Статус: ${tx.status}`);
    console.log(`  Принята: ${tx.acceptedAt ? tx.acceptedAt.toISOString() : 'НЕТ'}`);
    console.log(`  Реквизит: ${tx.requisites?.cardNumber || 'НЕ УКАЗАН'}`);
    console.log(`  BankDetailId: ${tx.bankDetailId || 'НЕ УКАЗАН'}`);
  }

  // Проверяем распределение по реквизитам
  console.log("\n=== Распределение по реквизитам ===");
  
  for (const requisite of trader.bankDetails) {
    const txCount = await db.transaction.count({
      where: {
        bankDetailId: requisite.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // За последние 24 часа
        }
      }
    });

    console.log(`\nРеквизит ${requisite.cardNumber}:`);
    console.log(`  ID: ${requisite.id}`);
    console.log(`  Транзакций за 24ч: ${txCount}`);
    console.log(`  Последнее обновление: ${requisite.updatedAt.toISOString()}`);
  }

  await db.$disconnect();
}

checkTraderTransactions().catch(console.error);