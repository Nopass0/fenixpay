import { db } from "../db"

async function main() {
  // Create a transaction directly through the database to see if freezing works
  console.log('Creating test transaction directly...')
  
  const merchant = await db.merchant.findFirst({ where: { name: 'test' } })
  const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } })
  const method = await db.method.findFirst({ where: { code: 'sber_c2c' } })
  const bankDetail = await db.bankDetail.findFirst({
    where: { userId: trader!.id, isArchived: false },
    include: { user: true }
  })
  
  if (!merchant || !trader || !method || !bankDetail) {
    console.log('Missing required data')
    return
  }

  console.log('Before transaction:')
  console.log('Trader frozen USDT:', trader.frozenUsdt)
  
  // Use the same transaction logic as the merchant endpoint
  const amount = 1000
  const rate = 100
  const kkkPercent = 8
  const feeInPercent = 3
  
  // Calculate freezing params
  const adjustedRate = Math.floor(rate * (1 - kkkPercent / 100) * 100) / 100
  const frozenUsdtAmount = Math.ceil((amount / adjustedRate) * 100) / 100
  const calculatedCommission = Math.ceil(frozenUsdtAmount * feeInPercent / 100 * 100) / 100
  const totalRequired = frozenUsdtAmount + calculatedCommission
  
  console.log('\nFreezing calculation:')
  console.log('Adjusted rate:', adjustedRate)
  console.log('Frozen USDT:', frozenUsdtAmount)
  console.log('Commission:', calculatedCommission)
  console.log('Total to freeze:', totalRequired)

  try {
    const result = await db.$transaction(async (prisma) => {
      // Create transaction
      const tx = await prisma.transaction.create({
        data: {
          merchantId: merchant.id,
          amount: amount,
          assetOrBank: bankDetail.cardNumber,
          orderId: `DIRECT_TEST_${Date.now()}`,
          methodId: method.id,
          currency: "RUB",
          userId: trader.id,
          userIp: '127.0.0.1',
          callbackUri: "",
          successUri: "",
          failUri: "",
          type: 'IN',
          expired_at: new Date(Date.now() + 3600000),
          commission: 0,
          clientName: trader.name,
          status: 'IN_PROGRESS',
          rate: rate,
          isMock: false,
          bankDetailId: bankDetail.id,
          traderId: trader.id,
          frozenUsdtAmount: frozenUsdtAmount,
          adjustedRate: adjustedRate,
          kkkPercent: kkkPercent,
          feeInPercent: feeInPercent,
          calculatedCommission: calculatedCommission,
        }
      })
      
      console.log('\nTransaction created:', tx.id)
      
      // Now freeze the funds
      console.log('Updating frozen balance...')
      const updated = await prisma.user.update({
        where: { id: trader.id },
        data: {
          frozenUsdt: { increment: totalRequired }
        }
      })
      
      console.log('Updated frozen USDT to:', updated.frozenUsdt)
      
      return { tx, updated }
    })
    
    console.log('\n✅ Success! Transaction created and funds frozen')
    
    // Verify by checking the trader again
    const traderAfter = await db.user.findUnique({ where: { id: trader.id } })
    console.log('\nFinal trader frozen USDT:', traderAfter?.frozenUsdt)
    
  } catch (error) {
    console.error('❌ Transaction failed:', error)
  }

  await db.$disconnect()
}

main().catch(console.error)