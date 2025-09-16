import { db } from "@/db";

async function checkTraders() {
  const traders = await db.user.findMany({ take: 5 });
  console.log("Existing traders:");
  traders.forEach(t => {
    console.log(`- ${t.email} (ID: ${t.id})`);
  });
  await db.$disconnect();
}

checkTraders();