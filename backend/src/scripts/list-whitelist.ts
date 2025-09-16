import { db } from "../db";

async function listWhitelist() {
  try {
    const entries = await db.adminIpWhitelist.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (entries.length === 0) {
      console.log("No IP addresses in whitelist");
    } else {
      console.log("Current IP whitelist:");
      console.log("=====================");
      entries.forEach(entry => {
        console.log(`IP: ${entry.ip}`);
        console.log(`Description: ${entry.description || 'No description'}`);
        console.log(`Added: ${entry.createdAt}`);
        console.log("---------------------");
      });
    }
  } catch (error) {
    console.error("Error fetching whitelist:", error);
  } finally {
    await db.$disconnect();
  }
}

listWhitelist();