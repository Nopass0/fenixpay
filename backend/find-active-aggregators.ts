import { db } from "@/db";

async function findActiveAggregators() {
  try {
    console.log("🔍 Поиск всех активных агрегаторов...");
    
    const activeAggregators = await db.aggregator.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        apiBaseUrl: true,
        maxSlaMs: true,
        isActive: true,
        isChaseCompatible: true,
        isChaseProject: true,
        apiToken: true,
        customApiToken: true
      },
      orderBy: { maxSlaMs: 'asc' }
    });

    console.log(`📊 Найдено ${activeAggregators.length} активных агрегаторов:`);
    console.log("");

    activeAggregators.forEach((agg, index) => {
      const apiKey = agg.customApiToken || agg.apiToken;
      const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A';
      const type = agg.isChaseProject ? 'Chase Project' : 
                  agg.isChaseCompatible ? 'Chase Compatible' : 'Standard';
      
      console.log(`${index + 1}. ${agg.name}`);
      console.log(`   ID: ${agg.id}`);
      console.log(`   Email: ${agg.email}`);
      console.log(`   API URL: ${agg.apiBaseUrl}`);
      console.log(`   Таймаут: ${agg.maxSlaMs}ms`);
      console.log(`   Тип: ${type}`);
      console.log(`   API Token: ${maskedKey}`);
      console.log(`   Custom API Token: ${agg.customApiToken ? `${agg.customApiToken.substring(0, 8)}...` : 'N/A'}`);
      console.log("");
    });

    // Ищем агрегаторы с domainchsp.ru
    const domainChspAggregators = await db.aggregator.findMany({
      where: {
        OR: [
          { apiBaseUrl: { contains: "domainchsp.ru" } },
          { name: { contains: "domainchsp" } },
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
        apiToken: true,
        customApiToken: true
      }
    });

    console.log("🔍 Агрегаторы с domainchsp.ru:");
    if (domainChspAggregators.length > 0) {
      domainChspAggregators.forEach(agg => {
        const apiKey = agg.customApiToken || agg.apiToken;
        const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A';
        console.log(`   - ${agg.name} (${agg.email})`);
        console.log(`     API URL: ${agg.apiBaseUrl}`);
        console.log(`     Таймаут: ${agg.maxSlaMs}ms`);
        console.log(`     Активен: ${agg.isActive}`);
        console.log(`     API Token: ${maskedKey}`);
        console.log("");
      });
    } else {
      console.log("   Не найдено агрегаторов с domainchsp.ru");
    }

    // Проверяем, есть ли агрегаторы с короткими таймаутами
    const shortTimeouts = activeAggregators.filter(agg => agg.maxSlaMs <= 2000);
    if (shortTimeouts.length > 0) {
      console.log("⚠️  Активные агрегаторы с короткими таймаутами:");
      shortTimeouts.forEach(agg => {
        console.log(`   - ${agg.name}: ${agg.maxSlaMs}ms`);
      });
    } else {
      console.log("✅ Все активные агрегаторы имеют достаточные таймауты");
    }

  } catch (error) {
    console.error("❌ Ошибка при поиске агрегаторов:", error);
  } finally {
    await db.$disconnect();
  }
}

// Запускаем скрипт
findActiveAggregators();
