import { db } from "../db";

async function fixTraderForTransactions() {
  console.log("=== Настройка трейдеров для получения транзакций ===\n");

  // Проверяем есть ли агент
  let agent = await db.agent.findFirst();
  
  if (!agent) {
    console.log("Создаем тестового агента...");
    agent = await db.agent.create({
      data: {
        name: "Test Agent",
        email: "agent@test.com",
        password: "test123", // В реальной системе должен быть хешированный пароль
        commissionRate: 10.0 // 10% комиссия по умолчанию
      }
    });
    console.log("Агент создан:", agent.id);
  } else {
    console.log("Агент уже существует:", agent.id);
  }

  // Теперь создаем команду если её нет
  let team = await db.team.findFirst({
    where: { name: "Test Team" }
  });

  if (!team) {
    console.log("Создаем тестовую команду...");
    team = await db.team.create({
      data: {
        name: "Test Team",
        agentId: agent.id
      }
    });
    console.log("Команда создана:", team.id);
  } else {
    console.log("Команда уже существует:", team.id);
  }

  // Обновляем трейдера с numericId = 1
  const trader1 = await db.user.update({
    where: { numericId: 1 },
    data: {
      teamId: team.id,
      trafficEnabled: true,
      deposit: 1000 // Уже есть депозит
    }
  });

  console.log("\nТрейдер с numericId 1 обновлен:");
  console.log(`  Email: ${trader1.email}`);
  console.log(`  Команда: ${trader1.teamId}`);
  console.log(`  Трафик включен: ${trader1.trafficEnabled}`);
  console.log(`  Депозит: ${trader1.deposit}`);

  // Также обновляем trader1@test.com чтобы он тоже соответствовал требованиям
  const trader16 = await db.user.update({
    where: { numericId: 16 },
    data: {
      teamId: team.id,
      deposit: 1000 // Добавляем депозит
    }
  });

  console.log("\nТрейдер с numericId 16 обновлен:");
  console.log(`  Email: ${trader16.email}`);
  console.log(`  Команда: ${trader16.teamId}`);
  console.log(`  Трафик включен: ${trader16.trafficEnabled}`);
  console.log(`  Депозит: ${trader16.deposit}`);

  // Проверяем реквизиты
  console.log("\n=== Проверка реквизитов ===");
  
  const allRequisites = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      user: {
        teamId: team.id,
        trafficEnabled: true,
        deposit: { gt: 0 }
      }
    },
    include: {
      user: {
        select: {
          email: true,
          numericId: true
        }
      }
    },
    orderBy: { updatedAt: "asc" }
  });

  console.log(`\nНайдено активных реквизитов для распределения транзакций: ${allRequisites.length}`);
  
  for (const req of allRequisites) {
    console.log(`  - ${req.cardNumber} (${req.bankType}) - Трейдер: ${req.user.email} (ID: ${req.user.numericId})`);
  }

  console.log("\nТеперь оба трейдера должны получать транзакции при создании новых!");

  await db.$disconnect();
}

fixTraderForTransactions().catch(console.error);