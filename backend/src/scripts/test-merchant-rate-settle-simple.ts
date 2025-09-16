import { db } from "@/db"

async function testMerchantRateSettleSimple() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    })
    
    if (!merchant) {
      console.error("Test merchant not found")
      return
    }
    
    // Find a valid method
    const method = await db.method.findFirst({
      where: { isEnabled: true }
    })
    
    if (!method) {
      console.error("No active method found")
      return
    }
    
    console.log("Using method:", method.name, "ID:", method.id)
    console.log("Merchant countInRubEquivalent:", merchant.countInRubEquivalent)
    
    // Toggle the countInRubEquivalent setting
    await db.merchant.update({
      where: { id: merchant.id },
      data: { countInRubEquivalent: false }
    })
    
    console.log("Updated merchant countInRubEquivalent to false")
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

testMerchantRateSettleSimple()