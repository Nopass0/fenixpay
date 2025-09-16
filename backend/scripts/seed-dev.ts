import { db } from '../src/db'
import { Currency, MethodType } from '@prisma/client'
import { randomBytes } from 'crypto'
import { sha256 } from '../src/utils/hash'

async function seedDevelopment() {
  try {
    console.log('🌱 Starting development seed...\n')

    // 1. Create test admin
    const admin = await db.admin.upsert({
      where: { token: 'test-admin-token' },
      update: {},
      create: {
        token: 'test-admin-token',
        role: 'SUPER_ADMIN'
      }
    })
    console.log('✓ Created test admin')

    // 2. Create test trader
    const trader = await db.user.upsert({
      where: { email: 'trader@test.com' },
      update: {},
      create: {
        email: 'trader@test.com',
        name: 'Test Trader',
        password: await sha256('test123'), // Properly hashed password
        balanceUsdt: 10000,
        balanceRub: 0,
        frozenUsdt: 0,
        profitFromDeals: 0,
        profitFromPayouts: 0
      }
    })
    console.log('✓ Created test trader')

    // 3. Create test merchant
    const merchant = await db.merchant.upsert({
      where: { token: 'test-merchant-token' },
      update: {},
      create: {
        name: 'Test Merchant',
        token: 'test-merchant-token',
        balanceUsdt: 5000,
        disabled: false,
        banned: false
      }
    })
    console.log('✓ Created test merchant')

    // 4. Create Wellbit merchant with API keys
    const wellbitToken = 'wellbit-' + randomBytes(32).toString('hex');
    await db.merchant.upsert({
      where: { token: wellbitToken },
      update: {},
      create: {
        name: 'Wellbit',
        token: wellbitToken,
        apiKeyPublic: randomBytes(16).toString('hex'),
        apiKeyPrivate: randomBytes(32).toString('hex'),
      }
    })
    console.log('✓ Created Wellbit merchant')

    // 5. Create payment methods
    const methods = [
      {
        code: 'sber_c2c',
        name: 'Сбербанк C2C',
        type: MethodType.c2c,
        currency: Currency.rub,
        commissionPayin: 2.5,
        commissionPayout: 1.5,
        maxPayin: 100000,
        minPayin: 1000,
        maxPayout: 100000,
        minPayout: 1000,
        chancePayin: 100,
        chancePayout: 100,
        isEnabled: true,
        rateSource: 'bybit'
      },
      {
        code: 'tinkoff_c2c',
        name: 'Тинькофф C2C',
        type: MethodType.c2c,
        currency: Currency.rub,
        commissionPayin: 2.5,
        commissionPayout: 1.5,
        maxPayin: 100000,
        minPayin: 1000,
        maxPayout: 100000,
        minPayout: 1000,
        chancePayin: 100,
        chancePayout: 100,
        isEnabled: true,
        rateSource: 'bybit'
      },
      {
        code: 'usdt_trc20',
        name: 'USDT TRC20',
        type: MethodType.crypto,
        currency: Currency.usdt,
        commissionPayin: 1,
        commissionPayout: 1,
        maxPayin: 1000000,
        minPayin: 10,
        maxPayout: 1000000,
        minPayout: 10,
        chancePayin: 100,
        chancePayout: 100,
        isEnabled: true,
        rateSource: 'bybit'
      }
    ]

    for (const method of methods) {
      await db.method.upsert({
        where: { code: method.code },
        update: {},
        create: method
      })
    }
    console.log('✓ Created payment methods')

    // 6. Create KKK setting
    await db.systemConfig.upsert({
      where: { key: 'kkk_percent' },
      update: {},
      create: {
        key: 'kkk_percent',
        value: '5'
      }
    })
    console.log('✓ Created KKK setting (5%)')

    // 7. Create services
    const services = [
      { name: 'ExpiredTransactionWatcher', displayName: 'Expired Transaction Watcher', description: 'Watches for expired transactions' },
      { name: 'MerchantEmulator', displayName: 'Merchant Emulator', description: 'Emulates merchant transactions' },
      { name: 'RateService', displayName: 'Rate Service', description: 'Updates exchange rates' },
      { name: 'TrafficService', displayName: 'Traffic Service', description: 'Manages traffic distribution' }
    ]

    for (const service of services) {
      await db.service.upsert({
        where: { name: service.name },
        update: {},
        create: {
          name: service.name,
          displayName: service.displayName,
          description: service.description,
          status: 'STOPPED'
        }
      })
    }
    console.log('✓ Created services')

    console.log('\n✅ Development seed completed successfully!')
    console.log('\nTest credentials:')
    console.log('- Admin token: test-admin-token')
    console.log('- Merchant token: test-merchant-token')
    console.log('- Trader email: trader@test.com')
    console.log('- Trader password: test123')

  } catch (error) {
    console.error('❌ Error during seed:', error)
  } finally {
    await db.$disconnect()
  }
}

seedDevelopment()