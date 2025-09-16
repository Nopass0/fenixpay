import { db } from "../src/db";

async function activateTestMerchant() {
  // Находим тестового мерчанта
  const testMerchant = await db.merchant.findFirst({
    where: { name: { contains: "test", mode: "insensitive" } }
  });

  if (!testMerchant) {
    console.error("Тестовый мерчант не найден!");
    process.exit(1);
  }

  console.log(`Найден мерчант: ${testMerchant.name}`);
  console.log(`Текущий статус: активен=${testMerchant.isActive}, отключен=${testMerchant.disabled}`);

  // Активируем мерчанта
  const updated = await db.merchant.update({
    where: { id: testMerchant.id },
    data: {
      isActive: true,
      disabled: false
    }
  });

  console.log(`\nМерчант обновлен:`);
  console.log(`  Активен: ${updated.isActive}`);
  console.log(`  Отключен: ${updated.disabled}`);

  // Проверяем методы мерчанта
  const methods = await db.merchantMethod.findMany({
    where: { merchantId: testMerchant.id },
    include: { method: true }
  });

  console.log(`\nМетоды мерчанта (${methods.length}):`);
  for (const mm of methods) {
    console.log(`  - ${mm.method.name} (${mm.method.type}): ${mm.isEnabled ? 'Включен' : 'Отключен'}`);
    
    // Если метод выключен, включаем его
    if (!mm.isEnabled) {
      await db.merchantMethod.update({
        where: { id: mm.id },
        data: { isEnabled: true }
      });
      console.log(`    ✓ Метод включен`);
    }
  }

  // Если у мерчанта нет методов, создаем их
  if (methods.length === 0) {
    console.log("\nУ мерчанта нет методов. Добавляем стандартные методы...");
    
    const allMethods = await db.method.findMany({
      where: { isEnabled: true }
    });

    for (const method of allMethods) {
      await db.merchantMethod.create({
        data: {
          merchantId: testMerchant.id,
          methodId: method.id,
          isEnabled: true
        }
      });
      console.log(`  ✓ Добавлен метод: ${method.name} (${method.type})`);
    }
  }

  process.exit(0);
}

activateTestMerchant().catch(console.error);