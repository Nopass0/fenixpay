import { db } from "../src/db";

async function listMethods() {
  try {
    const methods = await db.method.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        currency: true,
        commissionPayin: true,
        commissionPayout: true,
        isEnabled: true,
        minPayin: true,
        maxPayin: true,
        minPayout: true,
        maxPayout: true,
        chancePayin: true,
        chancePayout: true
      },
      orderBy: {
        code: 'asc'
      }
    });

    console.log("\n=== PAYMENT METHODS IN DATABASE ===\n");
    
    if (methods.length === 0) {
      console.log("No methods found in database.");
      console.log("Run the seed script first: bun run src/scripts/seed-methods.ts");
      return;
    }

    methods.forEach((method, index) => {
      console.log(`${index + 1}. ${method.name} (${method.code})`);
      console.log(`   ID: ${method.id}`);
      console.log(`   Type: ${method.type}`);
      console.log(`   Currency: ${method.currency}`);
      console.log(`   Commission: ${method.commissionPayin}% (payin), ${method.commissionPayout}% (payout)`);
      console.log(`   Payin limits: ${method.minPayin} - ${method.maxPayin}`);
      console.log(`   Payout limits: ${method.minPayout} - ${method.maxPayout}`);
      console.log(`   Success rates: ${method.chancePayin}% (payin), ${method.chancePayout}% (payout)`);
      console.log(`   Status: ${method.isEnabled ? 'ENABLED' : 'DISABLED'}`);
      console.log("");
    });

    console.log(`Total methods: ${methods.length}`);
    console.log(`Enabled methods: ${methods.filter(m => m.isEnabled).length}`);
    console.log(`Disabled methods: ${methods.filter(m => !m.isEnabled).length}`);

  } catch (error) {
    console.error("Error listing methods:", error);
  } finally {
    await db.$disconnect();
  }
}

listMethods();