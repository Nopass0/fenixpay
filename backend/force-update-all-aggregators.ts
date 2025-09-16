import { db } from "@/db";

async function forceUpdateAllAggregators() {
  try {
    console.log("🔄 Принудительное обновление всех агрегаторов...");
    
    // 1. Обновляем все агрегаторы с короткими таймаутами
    console.log("\n1️⃣ Обновление агрегаторов с короткими таймаутами...");
    const shortTimeoutAggregators = await db.aggregator.findMany({
      where: {
        maxSlaMs: { lte: 2000 }
      },
      select: {
        id: true,
        name: true,
        maxSlaMs: true,
        isActive: true
      }
    });

    console.log(`   Найдено ${shortTimeoutAggregators.length} агрегаторов с короткими таймаутами`);
    
    for (const agg of shortTimeoutAggregators) {
      const newTimeout = 5000;
      await db.aggregator.update({
        where: { id: agg.id },
        data: { maxSlaMs: newTimeout }
      });
      console.log(`   ✅ ${agg.name}: ${agg.maxSlaMs}ms → ${newTimeout}ms (${agg.isActive ? 'активен' : 'неактивен'})`);
    }

    // 2. Обновляем все активные агрегаторы до минимум 5000ms
    console.log("\n2️⃣ Обновление всех активных агрегаторов...");
    const activeAggregators = await db.aggregator.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        maxSlaMs: true
      }
    });

    for (const agg of activeAggregators) {
      if (agg.maxSlaMs < 5000) {
        await db.aggregator.update({
          where: { id: agg.id },
          data: { maxSlaMs: 5000 }
        });
        console.log(`   ✅ ${agg.name}: ${agg.maxSlaMs}ms → 5000ms`);
      } else {
        console.log(`   ✅ ${agg.name}: ${agg.maxSlaMs}ms (уже достаточно)`);
      }
    }

    // 3. Специально обновляем агрегатор domainchsp.ru
    console.log("\n3️⃣ Специальное обновление агрегатора domainchsp.ru...");
    const domainChspAggregators = await db.aggregator.findMany({
      where: {
        OR: [
          { apiBaseUrl: { contains: "domainchsp.ru" } },
          { name: { contains: "chsp" } }
        ]
      }
    });

    for (const agg of domainChspAggregators) {
      const newTimeout = 10000; // Устанавливаем еще больший таймаут для надежности
      await db.aggregator.update({
        where: { id: agg.id },
        data: { 
          maxSlaMs: newTimeout,
          updatedAt: new Date() // Принудительно обновляем время
        }
      });
      console.log(`   ✅ ${agg.name}: ${agg.maxSlaMs}ms → ${newTimeout}ms (обновлено время)`);
    }

    // 4. Проверяем финальное состояние
    console.log("\n4️⃣ Финальная проверка:");
    const finalCheck = await db.aggregator.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        apiBaseUrl: true,
        maxSlaMs: true,
        isActive: true,
        updatedAt: true
      },
      orderBy: { maxSlaMs: 'asc' }
    });

    console.log(`   Активных агрегаторов: ${finalCheck.length}`);
    finalCheck.forEach(agg => {
      console.log(`   - ${agg.name}: ${agg.maxSlaMs}ms (обновлен: ${agg.updatedAt})`);
    });

    // 5. Проверяем агрегаторы с domainchsp.ru
    console.log("\n5️⃣ Проверка агрегаторов с domainchsp.ru:");
    const domainChspFinal = await db.aggregator.findMany({
      where: {
        OR: [
          { apiBaseUrl: { contains: "domainchsp.ru" } },
          { name: { contains: "chsp" } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        apiBaseUrl: true,
        maxSlaMs: true,
        isActive: true,
        updatedAt: true
      }
    });

    domainChspFinal.forEach(agg => {
      console.log(`   - ${agg.name}: ${agg.maxSlaMs}ms (активен: ${agg.isActive}, обновлен: ${agg.updatedAt})`);
    });

    console.log("\n✅ Обновление завершено!");
    console.log("💡 Рекомендации:");
    console.log("   1. Перезапустите приложение на продакшене");
    console.log("   2. Проверьте, что используется правильная база данных");
    console.log("   3. Убедитесь, что нет кэширования настроек агрегаторов");

  } catch (error) {
    console.error("❌ Ошибка при обновлении агрегаторов:", error);
  } finally {
    await db.$disconnect();
  }
}

// Запускаем скрипт
forceUpdateAllAggregators();
