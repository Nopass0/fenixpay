import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function updateAggregatorMethods() {
  console.log("=== Обновление методов Chase агрегатора ===\n");

  try {
    // Находим Chase агрегатор
    const aggregator = await db.aggregator.findFirst({
      where: {
        isChaseCompatible: true
      }
    });

    if (!aggregator) {
      console.log("❌ Chase-совместимый агрегатор не найден!");
      return;
    }

    console.log(`Найден агрегатор: ${aggregator.name} (${aggregator.id})`);
    console.log(`Текущие методы:`);
    console.log(`  SBP: ${aggregator.sbpMethodId || 'не установлен'}`);
    console.log(`  C2C: ${aggregator.c2cMethodId || 'не установлен'}\n`);

    // Обновляем методы
    const updated = await db.aggregator.update({
      where: { id: aggregator.id },
      data: {
        sbpMethodId: 'cmdem3ozl013fqn011c0b154s',  // SBP method ID from Chase
        c2cMethodId: 'cmdem47hy013qqn01etlige96'   // C2C method ID from Chase
      }
    });

    console.log("✅ Методы успешно обновлены!");
    console.log(`Новые методы:`);
    console.log(`  SBP: ${updated.sbpMethodId}`);
    console.log(`  C2C: ${updated.c2cMethodId}`);

  } catch (error) {
    console.error("❌ Ошибка при обновлении:", error);
  } finally {
    await db.$disconnect();
  }
}

updateAggregatorMethods().catch(console.error);
