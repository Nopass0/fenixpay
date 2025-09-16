import { db } from "@/db";

async function checkMerchantKey() {
  try {
    const merchants = await db.merchant.findMany({
      select: { id: true, name: true, token: true }
    });

    if (merchants.length > 0) {
      console.log("Merchants found:");
      merchants.forEach((merchant) => {
        console.log("\n===================");
        console.log("ID:", merchant.id);
        console.log("Name:", merchant.name);
        console.log("Token:", merchant.token);
      });
      console.log("\n===================");
      console.log("\nUse one of these tokens as x-merchant-api-key header");
    } else {
      console.log("No merchants found");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

checkMerchantKey();