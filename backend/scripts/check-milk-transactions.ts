import { db } from '../src/db'

async function checkMilkTransactions() {
  console.log('=== CHECKING MILK TRANSACTIONS ===\n')

  // 1. Найдем все MILK транзакции
  const milkTx = await db.transaction.findMany({
    where: { status: 'MILK' },
    include: {
      merchant: true,
      method: true,
      trader: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  console.log(`Found ${milkTx.length} MILK transactions\n`)

  milkTx.forEach(tx => {
    console.log(`Transaction #${tx.numericId}:`)
    console.log(`  Amount: ${tx.amount} RUB`)
    console.log(`  Merchant: ${tx.merchant?.name || 'UNKNOWN'}`)
    console.log(`  Method: ${tx.method?.name || 'UNKNOWN'}`)
    console.log(`  Trader: ${tx.trader?.email || 'NOT ASSIGNED'}`)
    console.log(`  Type: ${tx.type}`)
    console.log(`  Created: ${tx.createdAt}`)
    console.log(`  Rate: ${tx.rate}`)
    console.log(`  Frozen USDT: ${tx.frozenUsdtAmount || 0}`)
    console.log('')
  })

  // 2. Проверим статусы в enum
  console.log('Checking Status enum in schema...')
  console.log('Valid statuses should be: CREATED, IN_PROGRESS, READY, EXPIRED, CANCELED')
  console.log('\nMILK is not a valid status!')

  // 3. Давайте исправим эти транзакции
  console.log('\n=== FIXING MILK TRANSACTIONS ===')
  
  const fixed = await db.transaction.updateMany({
    where: { status: 'MILK' },
    data: { status: 'CREATED' }
  })
  
  console.log(`✓ Fixed ${fixed.count} transactions from MILK to CREATED status`)

  // 4. Проверим, почему транзакции не назначаются трейдерам
  console.log('\n=== CHECKING TRANSACTION ASSIGNMENT ===')
  
  const unassignedTx = await db.transaction.findMany({
    where: { 
      traderId: null,
      type: 'IN'
    },
    include: {
      method: true,
      merchant: true
    },
    take: 5
  })

  console.log(`\nFound ${unassignedTx.length} unassigned IN transactions`)
  
  if (unassignedTx.length > 0) {
    console.log('\nChecking why they are not assigned...')
    
    for (const tx of unassignedTx) {
      console.log(`\nTransaction #${tx.numericId}:`)
      console.log(`  Method: ${tx.method?.name} (ID: ${tx.methodId})`)
      console.log(`  Merchant: ${tx.merchant?.name} (ID: ${tx.merchantId})`)
      
      // Проверим, есть ли TraderMerchant для этого метода и мерчанта
      const traderMerchants = await db.traderMerchant.findMany({
        where: {
          merchantId: tx.merchantId,
          methodId: tx.methodId
        },
        include: {
          trader: true
        }
      })
      
      console.log(`  Available traders for this method/merchant: ${traderMerchants.length}`)
      traderMerchants.forEach(tm => {
        console.log(`    - ${tm.trader.email} (balance: ${tm.trader.trustBalance}, frozen: ${tm.trader.frozenUsdt})`)
      })
    }
  }
}

checkMilkTransactions().catch(console.error).finally(() => process.exit(0))