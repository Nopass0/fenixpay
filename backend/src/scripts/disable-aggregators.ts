import { db } from "@/db";

async function disableAggregators() {
  try {
    // Деактивируем все агрегаторы
    const result = await db.aggregator.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    console.log(`Деактивировано ${result.count} агрегатор(ов)`);

    // Показываем текущее состояние
    const aggregators = await db.aggregator.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });

    console.log("\nТекущее состояние агрегаторов:");
    for (const agg of aggregators) {
      console.log(`- ${agg.name} (${agg.email}): ${agg.isActive ? 'АКТИВЕН' : 'НЕАКТИВЕН'}`);
    }

    console.log("\nТеперь система будет использовать только трейдеров для обработки транзакций.");

  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await db.$disconnect();
  }
}

disableAggregators();