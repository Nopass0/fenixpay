import { db } from "@/db";

async function fixProductionAggregator() {
  try {
    console.log("🔍 Поиск агрегатора на продакшене с API ключом 64f8c5b3...");
    
    // Ищем агрегатор по API ключу
    const aggregator = await db.aggregator.findFirst({
      where: {
        OR: [
          { apiToken: { contains: "64f8c5b3" } },
          { customApiToken: { contains: "64f8c5b3" } }
        ]
      }
    });

    if (!aggregator) {
      console.log("❌ Агрегатор с API ключом 64f8c5b3... не найден");
      
      // Покажем все агрегаторы для справки
      const allAggregators = await db.aggregator.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          apiBaseUrl: true,
          maxSlaMs: true,
          isActive: true,
          apiToken: true,
          customApiToken: true
        }
      });
      
      console.log("📋 Все агрегаторы в базе:");
      allAggregators.forEach(agg => {
        const apiKey = agg.customApiToken || agg.apiToken;
        const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A';
        console.log(`  - ${agg.name} (${agg.email}) - ${agg.apiBaseUrl} - ${agg.maxSlaMs}ms - ${agg.isActive ? 'активен' : 'неактивен'} - API: ${maskedKey}`);
      });
      
      return;
    }

    console.log(`✅ Найден агрегатор: ${aggregator.name}`);
    console.log(`   ID: ${aggregator.id}`);
    console.log(`   Email: ${aggregator.email}`);
    console.log(`   API URL: ${aggregator.apiBaseUrl}`);
    console.log(`   Текущий таймаут: ${aggregator.maxSlaMs}ms`);
    console.log(`   Активен: ${aggregator.isActive}`);
    console.log(`   API Token: ${aggregator.apiToken?.substring(0, 8)}...`);
    console.log(`   Custom API Token: ${aggregator.customApiToken?.substring(0, 8)}...`);

    // Обновляем таймаут с 2000ms до 5000ms (5 секунд)
    const newTimeout = 5000;
    
    const updatedAggregator = await db.aggregator.update({
      where: { id: aggregator.id },
      data: { maxSlaMs: newTimeout }
    });

    console.log(`✅ Таймаут обновлен с ${aggregator.maxSlaMs}ms до ${newTimeout}ms`);
    console.log(`   Новые настройки: ${updatedAggregator.name} - ${updatedAggregator.maxSlaMs}ms`);

    // Проверяем, что обновление прошло успешно
    const verifyAggregator = await db.aggregator.findUnique({
      where: { id: aggregator.id },
      select: { name: true, maxSlaMs: true, apiBaseUrl: true, isActive: true }
    });

    console.log(`🔍 Проверка: ${verifyAggregator?.name} - ${verifyAggregator?.maxSlaMs}ms - ${verifyAggregator?.apiBaseUrl} - ${verifyAggregator?.isActive ? 'активен' : 'неактивен'}`);

    // Дополнительно проверим, есть ли другие агрегаторы с короткими таймаутами
    console.log("\n🔍 Проверка других агрегаторов с короткими таймаутами...");
    const shortTimeoutAggregators = await db.aggregator.findMany({
      where: {
        maxSlaMs: { lte: 2000 },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        apiBaseUrl: true,
        maxSlaMs: true,
        isActive: true
      }
    });

    if (shortTimeoutAggregators.length > 0) {
      console.log(`⚠️  Найдено ${shortTimeoutAggregators.length} активных агрегаторов с короткими таймаутами:`);
      shortTimeoutAggregators.forEach(agg => {
        console.log(`   - ${agg.name}: ${agg.maxSlaMs}ms`);
      });
      
      console.log("\n🔄 Обновляем все активные агрегаторы с короткими таймаутами...");
      for (const agg of shortTimeoutAggregators) {
        await db.aggregator.update({
          where: { id: agg.id },
          data: { maxSlaMs: 5000 }
        });
        console.log(`   ✅ ${agg.name}: ${agg.maxSlaMs}ms → 5000ms`);
      }
    } else {
      console.log("✅ Все активные агрегаторы имеют достаточные таймауты");
    }

  } catch (error) {
    console.error("❌ Ошибка при обновлении агрегатора:", error);
  } finally {
    await db.$disconnect();
  }
}

// Запускаем скрипт
fixProductionAggregator();
