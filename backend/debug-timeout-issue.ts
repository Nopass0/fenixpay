import { db } from "@/db";

async function debugTimeoutIssue() {
  try {
    console.log("🔍 Диагностика проблемы с таймаутом...");
    
    // 1. Проверяем все агрегаторы с domainchsp.ru
    console.log("\n1️⃣ Проверка всех агрегаторов с domainchsp.ru:");
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
        isChaseCompatible: true,
        isChaseProject: true,
        apiToken: true,
        customApiToken: true,
        createdAt: true,
        updatedAt: true
      }
    });

    domainChspAggregators.forEach((agg, index) => {
      const apiKey = agg.customApiToken || agg.apiToken;
      const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A';
      console.log(`   ${index + 1}. ${agg.name}`);
      console.log(`      ID: ${agg.id}`);
      console.log(`      Email: ${agg.email}`);
      console.log(`      API URL: ${agg.apiBaseUrl}`);
      console.log(`      Таймаут: ${agg.maxSlaMs}ms`);
      console.log(`      Активен: ${agg.isActive}`);
      console.log(`      Chase Compatible: ${agg.isChaseCompatible}`);
      console.log(`      Chase Project: ${agg.isChaseProject}`);
      console.log(`      API Token: ${maskedKey}`);
      console.log(`      Custom API Token: ${agg.customApiToken ? `${agg.customApiToken.substring(0, 8)}...` : 'N/A'}`);
      console.log(`      Создан: ${agg.createdAt}`);
      console.log(`      Обновлен: ${agg.updatedAt}`);
      console.log("");
    });

    // 2. Проверяем все активные агрегаторы
    console.log("\n2️⃣ Проверка всех активных агрегаторов:");
    const activeAggregators = await db.aggregator.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        apiBaseUrl: true,
        maxSlaMs: true,
        isActive: true,
        apiToken: true,
        customApiToken: true
      },
      orderBy: { maxSlaMs: 'asc' }
    });

    activeAggregators.forEach((agg, index) => {
      const apiKey = agg.customApiToken || agg.apiToken;
      const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A';
      console.log(`   ${index + 1}. ${agg.name} - ${agg.maxSlaMs}ms - ${maskedKey}`);
    });

    // 3. Проверяем настройки по умолчанию
    console.log("\n3️⃣ Проверка настроек по умолчанию:");
    const defaultTimeout = 2000; // Из схемы Prisma
    console.log(`   Таймаут по умолчанию в схеме: ${defaultTimeout}ms`);

    // 4. Проверяем, есть ли агрегаторы с короткими таймаутами
    console.log("\n4️⃣ Проверка агрегаторов с короткими таймаутами:");
    const shortTimeoutAggregators = await db.aggregator.findMany({
      where: {
        maxSlaMs: { lte: 2000 }
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

    if (shortTimeoutAggregators.length > 0) {
      console.log(`   Найдено ${shortTimeoutAggregators.length} агрегаторов с короткими таймаутами:`);
      shortTimeoutAggregators.forEach(agg => {
        const apiKey = agg.customApiToken || agg.apiToken;
        const maskedKey = apiKey ? `${apiKey.substring(0, 8)}...` : 'N/A';
        console.log(`   - ${agg.name}: ${agg.maxSlaMs}ms (${agg.isActive ? 'активен' : 'неактивен'}) - ${maskedKey}`);
      });
    } else {
      console.log("   ✅ Нет агрегаторов с короткими таймаутами");
    }

    // 5. Проверяем переменные окружения
    console.log("\n5️⃣ Проверка переменных окружения:");
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'установлена' : 'не установлена'}`);
    console.log(`   BASE_URL: ${process.env.BASE_URL || 'не установлена'}`);
    console.log(`   API_URL: ${process.env.API_URL || 'не установлена'}`);

    // 6. Рекомендации
    console.log("\n6️⃣ Рекомендации:");
    if (shortTimeoutAggregators.length > 0) {
      console.log("   ⚠️  Найдены агрегаторы с короткими таймаутами - обновите их до 5000ms");
    }
    
    const domainChspActive = domainChspAggregators.find(agg => agg.isActive);
    if (domainChspActive) {
      console.log(`   ✅ Активный агрегатор domainchsp.ru найден: ${domainChspActive.name} (${domainChspActive.maxSlaMs}ms)`);
      if (domainChspActive.maxSlaMs <= 2000) {
        console.log("   ⚠️  Таймаут слишком короткий - обновите до 5000ms");
      }
    } else {
      console.log("   ❌ Активный агрегатор domainchsp.ru не найден");
    }

  } catch (error) {
    console.error("❌ Ошибка при диагностике:", error);
  } finally {
    await db.$disconnect();
  }
}

// Запускаем скрипт
debugTimeoutIssue();
