import { db } from "../db";
import { MethodType, Currency } from "@prisma/client";

async function seedMethods() {
  try {
    const methods = [
      {
        code: "SBP",
        name: "Система быстрых платежей",
        type: MethodType.sbp,
        currency: Currency.rub,
        commissionPayin: 2.5,
        commissionPayout: 1.5,
        minPayin: 1000,
        maxPayin: 100000,
        minPayout: 500,
        maxPayout: 50000,
        chancePayin: 90,
        chancePayout: 95,
        isEnabled: true
      },
      {
        code: "CARD",
        name: "Банковская карта",
        type: MethodType.c2c,
        currency: Currency.rub,
        commissionPayin: 3.0,
        commissionPayout: 2.0,
        minPayin: 1000,
        maxPayin: 150000,
        minPayout: 500,
        maxPayout: 75000,
        chancePayin: 85,
        chancePayout: 90,
        isEnabled: true
      },
      {
        code: "P2P",
        name: "P2P перевод",
        type: MethodType.c2c,
        currency: Currency.rub,
        commissionPayin: 1.5,
        commissionPayout: 1.0,
        minPayin: 500,
        maxPayin: 200000,
        minPayout: 500,
        maxPayout: 100000,
        chancePayin: 95,
        chancePayout: 98,
        isEnabled: true
      }
    ];

    for (const method of methods) {
      const existing = await db.method.findFirst({
        where: { code: method.code }
      });

      if (!existing) {
        const created = await db.method.create({
          data: method
        });
        console.log(`✅ Created method: ${created.name} (${created.code}) with ID: ${created.id}`);
      } else {
        // Update to enable it
        const updated = await db.method.update({
          where: { id: existing.id },
          data: { isEnabled: true }
        });
        console.log(`✅ Updated method: ${updated.name} (${updated.code}) to enabled`);
      }
    }

    console.log("\nMethods seeded successfully!");

  } catch (error) {
    console.error("Error seeding methods:", error);
  } finally {
    await db.$disconnect();
  }
}

seedMethods();