import { db } from "../db"

async function main() {
  // Get test merchant and trader
  const merchant = await db.merchant.findFirst({ where: { name: 'test' } })
  const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } })
  
  if (!merchant || !trader) {
    console.log('Test merchant or trader not found')
    return
  }

  // Check KKK setting
  const kkkSetting = await db.systemConfig.findUnique({
    where: { key: 'kkk_percent' }
  })
  
  console.log('KKK Percent:', kkkSetting?.value || '0')

  // Check trader-merchant settings for all methods
  const methods = await db.method.findMany({ where: { isEnabled: true } })
  
  for (const method of methods) {
    const traderMerchantSettings = await db.traderMerchant.findUnique({
      where: {
        traderId_merchantId_methodId: {
          traderId: trader.id,
          merchantId: merchant.id,
          methodId: method.id
        }
      }
    })
    
    console.log(`\nMethod: ${method.name} (${method.id})`)
    console.log('Fee In:', traderMerchantSettings?.feeIn ?? 'Not set (default 0)')
    console.log('Fee Out:', traderMerchantSettings?.feeOut ?? 'Not set (default 0)')
  }

  // Check why commission might be 0 or NULL
  const recentTx = await db.transaction.findFirst({
    where: { traderId: trader.id, type: 'IN' },
    orderBy: { createdAt: 'desc' }
  })

  if (recentTx) {
    console.log('\n\nMost recent transaction:')
    console.log('Frozen USDT:', recentTx.frozenUsdtAmount)
    console.log('Commission:', recentTx.calculatedCommission)
    console.log('Fee In Percent:', recentTx.feeInPercent)
    console.log('KKK Percent:', recentTx.kkkPercent)
  }

  await db.$disconnect()
}

main().catch(console.error)