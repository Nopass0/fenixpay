import { db } from "@/db";

async function checkAllAggregatorTimeouts() {
  try {
    console.log("🔍 Проверка таймаутов всех агрегаторов...");
    
    const aggregators = await db.aggregator.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        apiBaseUrl: true,
        maxSlaMs: true,
        isActive: true,
        isChaseCompatible: true,
        isChaseProject: true
      },
      orderBy: { maxSlaMs: 'asc' }
    });

    console.log(`📊 Найдено ${aggregators.length} агрегаторов:`);
    console.log("");

    aggregators.forEach((agg, index) => {
      const status = agg.isActive ? '✅' : '❌';
      const type = agg.isChaseProject ? 'Chase Project' : 
                  agg.isChaseCompatible ? 'Chase Compatible' : 'Standard';
      
      console.log(`${index + 1}. ${status} ${agg.name}`);
      console.log(`   Email: ${agg.email}`);
      console.log(`   API URL: ${agg.apiBaseUrl}`);
      console.log(`   Таймаут: ${agg.maxSlaMs}ms`);
      console.log(`   Тип: ${type}`);
      console.log(`   Активен: ${agg.isActive}`);
      console.log("");
    });

    // Статистика по таймаутам
    const shortTimeouts = aggregators.filter(agg => agg.maxSlaMs <= 2000);
    const mediumTimeouts = aggregators.filter(agg => agg.maxSlaMs > 2000 && agg.maxSlaMs <= 5000);
    const longTimeouts = aggregators.filter(agg => agg.maxSlaMs > 5000);

    console.log("📈 Статистика таймаутов:");
    console.log(`   Короткие (≤2000ms): ${shortTimeouts.length} агрегаторов`);
    console.log(`   Средние (2001-5000ms): ${mediumTimeouts.length} агрегаторов`);
    console.log(`   Длинные (>5000ms): ${longTimeouts.length} агрегаторов`);

    if (shortTimeouts.length > 0) {
      console.log("");
      console.log("⚠️  Агрегаторы с короткими таймаутами (могут вызывать проблемы):");
      shortTimeouts.forEach(agg => {
        console.log(`   - ${agg.name}: ${agg.maxSlaMs}ms`);
      });
    }

  } catch (error) {
    console.error("❌ Ошибка при проверке таймаутов:", error);
  } finally {
    await db.$disconnect();
  }
}

// Запускаем скрипт
checkAllAggregatorTimeouts();
