import { db } from "../src/db"

async function debugTransactionRequisites() {
  try {
    // Find any transaction with bankDetailId
    const transaction = await db.transaction.findFirst({
      where: { 
        bankDetailId: { not: null },
        amount: 1000
      },
      include: {
        merchant: true,
        method: true,
        receipts: true,
        requisites: true
      }
    })
    
    console.log("Transaction found:", !!transaction)
    if (transaction) {
      console.log("Transaction ID:", transaction.id)
      console.log("bankDetailId:", transaction.bankDetailId)
      console.log("Has requisites:", !!transaction.requisites)
      if (transaction.requisites) {
        console.log("Requisite name:", transaction.requisites.recipientName)
        console.log("Requisite ID:", transaction.requisites.id)
      }
      
      // Check if bankDetail exists separately
      if (transaction.bankDetailId) {
        const bankDetail = await db.bankDetail.findUnique({
          where: { id: transaction.bankDetailId }
        })
        console.log("BankDetail exists:", !!bankDetail)
        if (bankDetail) {
          console.log("BankDetail name:", bankDetail.recipientName)
        }
      }
    }
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await db.$disconnect()
  }
}

debugTransactionRequisites()