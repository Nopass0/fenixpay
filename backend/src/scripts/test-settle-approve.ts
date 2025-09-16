import { db } from "@/db"

async function testSettleApprove() {
  try {
    console.log("Testing settle request approval...")
    
    // Find a pending settle request
    const pendingRequest = await db.settleRequest.findFirst({
      where: { status: "PENDING" },
      include: {
        merchant: true
      }
    })
    
    if (!pendingRequest) {
      console.log("No pending settle requests found")
      return
    }
    
    console.log("Found pending request:", pendingRequest.id)
    console.log("Merchant:", pendingRequest.merchant)
    
    // Try to update it
    const updated = await db.settleRequest.update({
      where: { id: pendingRequest.id },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
        processedBy: "SUPER_ADMIN"
      }
    })
    
    console.log("Updated successfully:", updated)
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

testSettleApprove()