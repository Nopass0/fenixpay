import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function updateMethodId() {
  console.log("=== Обновление C2C methodId для Chase агрегатора ===\n");

  try {
    const aggregator = await db.aggregator.findFirst({
      where: { isChaseCompatible: true }
    });

    if (!aggregator) {
      console.log("❌ Chase-совместимый агрегатор не найден!");
      return;
    }

    console.log(`Найден агрегатор: ${aggregator.name}`);
    console.log(`Текущий C2C methodId: ${aggregator.c2cMethodId}`);

    // Обновляем C2C methodId на тот, что работает в Chase API
    const updated = await db.aggregator.update({
      where: { id: aggregator.id },
      data: {
        c2cMethodId: 'cmfjsx514040otozcsg3tum7x'
      }
    });

    console.log("\n✅ C2C methodId успешно обновлён!");
    console.log(`Новый C2C methodId: ${updated.c2cMethodId}`);

  } catch (error) {
    console.error("❌ Ошибка при обновлении:", error);
  } finally {
    await db.$disconnect();
  }
}

updateMethodId().catch(console.error);
