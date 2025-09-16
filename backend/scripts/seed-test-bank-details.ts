import { db } from '../src/db'
import { BankType, MethodType } from '@prisma/client'

async function seedTestBankDetails() {
  try {
    console.log('🏦 Creating test bank details for device emulator...\n')

    // First, ensure we have a test trader user
    const trader = await db.user.upsert({
      where: { email: 'device-test-trader@test.com' },
      update: {},
      create: {
        email: 'device-test-trader@test.com',
        name: 'Device Test Trader',
        password: 'test123', // In production, this should be hashed
        balanceUsdt: 10000,
        balanceRub: 0,
        frozenUsdt: 0,
        profitFromDeals: 0,
        profitFromPayouts: 0,
        trafficEnabled: true,
        minInsuranceDeposit: 0,
        maxInsuranceDeposit: 100000,
        minAmountPerRequisite: 100,
        maxAmountPerRequisite: 100000
      }
    })
    console.log('✓ Created/found test trader for devices')

    // Create bank details for test-sber-1
    const sberBankDetail = await db.bankDetail.upsert({
      where: { id: 'test-sber-1' },
      update: {
        isArchived: false // Ensure it's not archived
      },
      create: {
        id: 'test-sber-1',
        userId: trader.id,
        methodType: MethodType.c2c,
        bankType: BankType.SBERBANK,
        cardNumber: '4276000011112222',
        recipientName: 'TEST SBER USER',
        phoneNumber: '+79001234567',
        minAmount: 100,
        maxAmount: 100000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        maxCountTransactions: 100,
        intervalMinutes: 0,
        dailyTraffic: 0,
        monthlyTraffic: 0,
        isArchived: false
      }
    })
    console.log('✓ Created bank detail for test-sber-1')

    // Create bank details for test-tink-1
    const tinkBankDetail = await db.bankDetail.upsert({
      where: { id: 'test-tink-1' },
      update: {
        isArchived: false // Ensure it's not archived
      },
      create: {
        id: 'test-tink-1',
        userId: trader.id,
        methodType: MethodType.c2c,
        bankType: BankType.TBANK, // TBANK is the enum value for Tinkoff
        cardNumber: '5536000022223333',
        recipientName: 'TEST TINK USER',
        phoneNumber: '+79002345678',
        minAmount: 100,
        maxAmount: 100000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        maxCountTransactions: 100,
        intervalMinutes: 0,
        dailyTraffic: 0,
        monthlyTraffic: 0,
        isArchived: false
      }
    })
    console.log('✓ Created bank detail for test-tink-1')

    // Check if devices already exist for these bank details and clean them up
    const existingBankDetailsWithDevices = await db.bankDetail.findMany({
      where: {
        id: {
          in: ['test-sber-1', 'test-tink-1']
        },
        deviceId: {
          not: null
        }
      },
      include: {
        device: true
      }
    })

    if (existingBankDetailsWithDevices.length > 0) {
      console.log(`Found ${existingBankDetailsWithDevices.length} bank details with devices, cleaning up...`)
      
      const deviceIds = existingBankDetailsWithDevices
        .filter(bd => bd.device)
        .map(bd => bd.device!.id)
      
      if (deviceIds.length > 0) {
        // Delete notifications first
        await db.notification.deleteMany({
          where: {
            deviceId: {
              in: deviceIds
            }
          }
        })
        
        // Then delete devices
        await db.device.deleteMany({
          where: {
            id: {
              in: deviceIds
            }
          }
        })
        
        console.log('✓ Cleaned up existing devices')
      }
    }

    console.log('\n✅ Test bank details created successfully!')
    console.log('\nBank details created:')
    console.log('- test-sber-1 (SBERBANK)')
    console.log('- test-tink-1 (TBANK)')
    console.log('\nThese can now be used by the DeviceEmulatorService')

  } catch (error) {
    console.error('❌ Error creating test bank details:', error)
  } finally {
    await db.$disconnect()
  }
}

seedTestBankDetails()