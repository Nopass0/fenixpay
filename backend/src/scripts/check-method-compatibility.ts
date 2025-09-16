import { db } from '@/db'

async function checkMethodCompatibility() {
  console.log('Checking method and bank detail compatibility...\n')
  
  // Get all active methods
  const methods = await db.method.findMany({
    where: { isEnabled: true }
  })
  
  console.log('Active methods:')
  methods.forEach(m => {
    console.log(`  ${m.name} (${m.code}) - Type: ${m.type}, Currency: ${m.currency}`)
    console.log(`    Limits: ${m.minPayin} - ${m.maxPayin} RUB`)
  })
  
  // Get all active bank details
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
          minAmountPerRequisite: true,
          maxAmountPerRequisite: true
        }
      }
    }
  })
  
  console.log('\n\nBank details:')
  bankDetails.forEach(bd => {
    console.log(`  ${bd.bankType}: ${bd.cardNumber} (${bd.user.name || bd.user.email})`)
    console.log(`    Method Type: ${bd.methodType}`)
    console.log(`    Bank limits: ${bd.minAmount} - ${bd.maxAmount} RUB`)
    console.log(`    User limits: ${bd.user.minAmountPerRequisite} - ${bd.user.maxAmountPerRequisite} RUB`)
  })
  
  // Check compatibility
  console.log('\n\nCompatibility check:')
  methods.forEach(method => {
    const compatible = bankDetails.filter(bd => bd.methodType === method.type)
    console.log(`\n${method.name} (${method.type}):`)
    if (compatible.length === 0) {
      console.log('  ❌ No compatible bank details')
    } else {
      console.log(`  ✅ ${compatible.length} compatible bank details:`)
      compatible.forEach(bd => {
        console.log(`     - ${bd.bankType}: ${bd.cardNumber}`)
      })
    }
  })
  
  await db.$disconnect()
}

checkMethodCompatibility().catch(console.error)