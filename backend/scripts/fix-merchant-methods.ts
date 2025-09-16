import { db } from '../src/db'

async function fixMerchantMethods() {
  console.log('=== FIXING MERCHANT-METHOD LINKS ===\n')

  // 1. Найдем мерчанта Test Merchant
  const testMerchant = await db.merchant.findFirst({
    where: { name: 'Test Merchant' }
  })

  if (!testMerchant) {
    console.log('Test Merchant not found!')
    return
  }

  console.log(`Found merchant: ${testMerchant.name} (ID: ${testMerchant.id})`)

  // 2. Найдем все методы
  const methods = await db.method.findMany({
    where: { isEnabled: true }
  })

  console.log(`Found ${methods.length} active methods`)

  // 3. Создаем связи MerchantMethod
  console.log('\nCreating MerchantMethod relationships...')
  
  for (const method of methods) {
    // Проверяем, есть ли уже связь
    const existing = await db.merchantMethod.findUnique({
      where: {
        merchantId_methodId: {
          merchantId: testMerchant.id,
          methodId: method.id
        }
      }
    })

    if (!existing) {
      await db.merchantMethod.create({
        data: {
          merchantId: testMerchant.id,
          methodId: method.id,
          isEnabled: true
        }
      })
      console.log(`✓ Created link: ${testMerchant.name} - ${method.name}`)
    } else {
      console.log(`- Link already exists: ${testMerchant.name} - ${method.name} (enabled: ${existing.isEnabled})`)
    }
  }

  console.log('\n✅ Done!')
}

fixMerchantMethods().catch(console.error).finally(() => process.exit(0))