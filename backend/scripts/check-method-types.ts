import { db } from "../src/db";

async function checkMethodTypes() {
  console.log("=== Проверка типов методов ===\n");

  const methods = await db.method.findMany();
  console.log("Методы в базе:");
  methods.forEach(m => {
    console.log(`  ${m.name}:`);
    console.log(`    ID: ${m.id}`);
    console.log(`    type: '${m.type}'`);
    console.log(`    code: '${m.code}'`);
  });

  const bankDetails = await db.bankDetail.findMany({
    where: { userId: "cmdhsfzk102z8ikbmo8rgrtmi" }
  });
  
  console.log("\nРеквизиты трейдера:");
  bankDetails.forEach(bd => {
    console.log(`  ${bd.bankType} ${bd.cardNumber}:`);
    console.log(`    methodType: '${bd.methodType}'`);
  });

  // Проверяем точное совпадение
  console.log("\n\nПроверка совпадений:");
  for (const method of methods) {
    const matchingReqs = bankDetails.filter(bd => bd.methodType === method.type);
    console.log(`\nМетод ${method.name} (type='${method.type}'):`);
    console.log(`  Подходящих реквизитов: ${matchingReqs.length}`);
    if (matchingReqs.length === 0) {
      // Проверяем case-insensitive
      const caseInsensitive = bankDetails.filter(bd => 
        bd.methodType.toLowerCase() === method.type.toLowerCase()
      );
      if (caseInsensitive.length > 0) {
        console.log(`  ⚠️  Найдено с другим регистром: ${caseInsensitive.length}`);
      }
    }
  }

  process.exit(0);
}

checkMethodTypes().catch(console.error);