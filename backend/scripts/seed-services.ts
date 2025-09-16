import { db } from '../src/db'

async function seedServices() {
  try {
    // Create the required services
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
      console.log(`✓ Created/Updated service: ${service.name}`)
    }

    console.log('\n✓ All services have been seeded successfully')
  } catch (error) {
    console.error('Error seeding services:', error)
  } finally {
    await db.$disconnect()
  }
}

seedServices()