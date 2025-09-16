import { db } from "@/db";

async function fixDomainChspTimeout() {
  try {
    console.log("🔍 Поиск агрегатора domainchsp.ru...");
    
    // Ищем агрегатор по домену
    const aggregator = await db.aggregator.findFirst({
      where: {
        OR: [
          { apiBaseUrl: { contains: "domainchsp.ru" } },
          { name: { contains: "domainchsp" } },
          { email: { contains: "domainchsp" } }
        ]
      }
    });

    if (!aggregator) {
      console.log("❌ Агрегатор domainchsp.ru не найден");
      
      // Покажем все агрегаторы для справки
      const allAggregators = await db.aggregator.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          apiBaseUrl: true,
          maxSlaMs: true,
          isActive: true
        }
      });
      
      console.log("📋 Доступные агрегаторы:");
      allAggregators.forEach(agg => {
        console.log(`  - ${agg.name} (${agg.email}) - ${agg.apiBaseUrl} - ${agg.maxSlaMs}ms - ${agg.isActive ? 'активен' : 'неактивен'}`);
      });
      
      return;
    }

    console.log(`✅ Найден агрегатор: ${aggregator.name}`);
    console.log(`   ID: ${aggregator.id}`);
    console.log(`   Email: ${aggregator.email}`);
    console.log(`   API URL: ${aggregator.apiBaseUrl}`);
    console.log(`   Текущий таймаут: ${aggregator.maxSlaMs}ms`);
    console.log(`   Активен: ${aggregator.isActive}`);

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
      select: { name: true, maxSlaMs: true, apiBaseUrl: true }
    });

    console.log(`🔍 Проверка: ${verifyAggregator?.name} - ${verifyAggregator?.maxSlaMs}ms - ${verifyAggregator?.apiBaseUrl}`);

  } catch (error) {
    console.error("❌ Ошибка при обновлении таймаута:", error);
  } finally {
    await db.$disconnect();
  }
}

// Запускаем скрипт
fixDomainChspTimeout();
