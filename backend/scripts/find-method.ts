import { db } from "../src/db";

async function main() {
  try {
    // Find c2c method
    const method = await db.method.findFirst({
      where: {
        code: "c2c"
      }
    });

    if (method) {
      console.log("Found method:", method);
    } else {
      // Create method if it doesn't exist
      const newMethod = await db.method.create({
        data: {
          code: "c2c",
          name: "Card to Card",
          type: "c2c",
          commissionPayin: 2,
          commissionPayout: 2,
          maxPayin: 1000000,
          minPayin: 100,
          maxPayout: 1000000,
          minPayout: 100,
          chancePayin: 95,
          chancePayout: 95
        }
      });
      console.log("Created method:", newMethod);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();