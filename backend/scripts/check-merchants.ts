import { db } from "@/db";

async function checkMerchants() {
  const merchants = await db.merchant.findMany({ take: 5 });
  console.log("Existing merchants:");
  merchants.forEach(m => {
    console.log(`- ${m.name} (ID: ${m.id}, API Key: ${m.apiKey})`);
  });
  await db.$disconnect();
}

checkMerchants();