import { db } from "../db"
import { calculateFreezingParams } from "../utils/freezing"

async function main() {
  // Simulate the exact conditions from the merchant endpoint
  const merchant = await db.merchant.findFirst({ where: { name: 'test' } })
  const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } })
  const method = await db.method.findFirst({ where: { isEnabled: true } })
  
  if (!merchant || !trader || !method) {
    console.log('Missing test data')
    return
  }

  console.log('Test data:')
  console.log('Merchant ID:', merchant.id)
  console.log('Trader ID:', trader.id)  
  console.log('Method ID:', method.id)

  // Get a bank detail for this trader
  const bankDetail = await db.bankDetail.findFirst({
    where: {
      userId: trader.id,
      isArchived: false,
      methodType: method.type
    },
    include: { user: true }
  })

  if (!bankDetail) {
    console.log('No bank details found for trader')
    return
  }

  console.log('\nBank detail:')
  console.log('ID:', bankDetail.id)
  console.log('Has user relation:', !!bankDetail.user)
  console.log('User ID from relation:', bankDetail.user?.id)

  // Test freezing calculation
  const amount = 1000
  const rate = 100
  
  // Get settings
  const kkkSetting = await db.systemConfig.findUnique({
    where: { key: 'kkk_percent' }
  })
  
  const traderMerchantSettings = await db.traderMerchant.findUnique({
    where: {
      traderId_merchantId_methodId: {
        traderId: trader.id,
        merchantId: merchant.id,
        methodId: method.id
      }
    }
  })

  const kkkPercent = kkkSetting ? parseFloat(kkkSetting.value) : 0
  const feeInPercent = traderMerchantSettings?.feeIn ?? 0

  console.log('\nFreezing settings:')
  console.log('KKK percent:', kkkPercent)
  console.log('Fee in percent:', feeInPercent)

  const freezingParams = calculateFreezingParams(amount, rate, kkkPercent, feeInPercent)
  
  console.log('\nFreezing params:')
  console.log('Adjusted rate:', freezingParams.adjustedRate)
  console.log('Frozen USDT amount:', freezingParams.frozenUsdtAmount)
  console.log('Calculated commission:', freezingParams.calculatedCommission)
  console.log('Total required:', freezingParams.totalRequired)

  // Check conditions for freezing
  console.log('\nFreezing conditions:')
  console.log('freezingParams exists:', !!freezingParams)
  console.log('chosen.user exists:', !!bankDetail.user)
  console.log('Should freeze:', !!freezingParams && !!bankDetail.user)

  // Test the actual update
  if (freezingParams && bankDetail.user) {
    console.log('\nTesting frozen balance update...')
    
    const before = await db.user.findUnique({ where: { id: trader.id } })
    console.log('Before: frozenUsdt =', before?.frozenUsdt)
    
    try {
      const updated = await db.user.update({
        where: { id: trader.id },
        data: {
          frozenUsdt: { increment: freezingParams.totalRequired }
        }
      })
      console.log('After: frozenUsdt =', updated.frozenUsdt)
      console.log('✅ Update successful!')
      
      // Revert the test update
      await db.user.update({
        where: { id: trader.id },
        data: {
          frozenUsdt: { decrement: freezingParams.totalRequired }
        }
      })
      console.log('Reverted test update')
    } catch (error) {
      console.error('❌ Update failed:', error)
    }
  }

  await db.$disconnect()
}

main().catch(console.error)