import { db } from "../src/db"

async function updateTraderLimits() {
  try {
    // Update the example trader to have no maximum amount limit
    await db.user.update({
      where: { email: "trader@example.com" },
      data: {
        maxAmountPerRequisite: 999999999 // Effectively no limit
      }
    })
    
    console.log("✅ Updated trader limits - removed maximum amount restriction")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

updateTraderLimits()