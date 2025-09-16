import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function updateApiKey() {
  console.log("=== Обновление API ключа Chase агрегатора ===\n");

  try {
    const aggregator = await db.aggregator.findFirst({
      where: { isChaseCompatible: true }
    });

    if (!aggregator) {
      console.log("❌ Chase-совместимый агрегатор не найден!");
      return;
    }

    console.log(`Найден агрегатор: ${aggregator.name}`);
    console.log(`Текущий API ключ: ${aggregator.customApiToken || aggregator.apiToken}`);

    // Обновляем API ключ на правильный
    const updated = await db.aggregator.update({
      where: { id: aggregator.id },
      data: {
        customApiToken: 'b00607ffee5f95a41906214e87aa282f8de37289a9e2a537a16821a2f2729bc4'
      }
    });

    console.log("\n✅ API ключ успешно обновлён!");
    console.log(`Новый API ключ: ${updated.customApiToken}`);

  } catch (error) {
    console.error("❌ Ошибка при обновлении:", error);
  } finally {
    await db.$disconnect();
  }
}

updateApiKey().catch(console.error);
