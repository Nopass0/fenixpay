import { db } from '@/db'

async function checkTestMerchant() {
  console.log('Checking test merchant setup...\n')
  
  // Check if test merchant exists
  const testMerchant = await db.merchant.findFirst({
    where: { name: 'test' }
  })
  
  if (!testMerchant) {
    console.log('❌ Test merchant not found. Create a merchant with name "test"')
    process.exit(1)
  }
  
  console.log('✅ Test merchant found:', {
    id: testMerchant.id,
    name: testMerchant.name,
    token: testMerchant.token
  })
  
  // Check active methods
  const merchantMethods = await db.merchantMethod.findMany({
    where: {
      merchantId: testMerchant.id,
      isEnabled: true
    },
    include: {
      method: true
    }
  })
  
  console.log(`\n✅ Active methods: ${merchantMethods.length}`)
  merchantMethods.forEach(mm => {
    console.log(`  - ${mm.method.name} (${mm.method.code})`)
  })
  
  // Check available bank details
  const bankDetails = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      user: { banned: false }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          balanceUsdt: true,
          frozenUsdt: true
        }
      }
    }
  })
  
  console.log(`\n✅ Available bank details: ${bankDetails.length}`)
  bankDetails.forEach(bd => {
    const availableBalance = bd.user.balanceUsdt - bd.user.frozenUsdt
    console.log(`  - ${bd.bankType}: ${bd.cardNumber} (${bd.user.name || bd.user.email})`)
    console.log(`    Balance: ${bd.user.balanceUsdt} USDT, Frozen: ${bd.user.frozenUsdt} USDT, Available: ${availableBalance} USDT`)
    console.log(`    Limits: ${bd.minAmount} - ${bd.maxAmount} RUB`)
  })
  
  if (bankDetails.length === 0) {
    console.log('\n❌ No active bank details found. Traders need to add bank details.')
  }
  
  // Check trader-merchant relationships
  const traderMerchants = await db.traderMerchant.count({
    where: { merchantId: testMerchant.id }
  })
  
  console.log(`\n✅ Trader-merchant relationships: ${traderMerchants}`)
  
  if (traderMerchants === 0) {
    console.log('❌ No traders assigned to test merchant')
  }
  
  await db.$disconnect()
}

checkTestMerchant().catch(console.error)