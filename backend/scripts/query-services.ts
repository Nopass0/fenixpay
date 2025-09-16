import { db } from '../src/db'

async function queryServices() {
  try {
    const services = await db.service.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        status: true,
        enabled: true,
        lastTick: true,
        errorCount: true
      }
    })

    console.log('Services in database:')
    console.log('====================')
    
    if (services.length === 0) {
      console.log('No services found!')
    } else {
      services.forEach(service => {
        console.log(`\n${service.displayName} (${service.name})`)
        console.log(`  ID: ${service.id}`)
        console.log(`  Status: ${service.status}`)
        console.log(`  Enabled: ${service.enabled}`)
        console.log(`  Last tick: ${service.lastTick || 'Never'}`)
        console.log(`  Error count: ${service.errorCount}`)
      })
    }

    console.log('\n')
  } catch (error) {
    console.error('Error querying services:', error)
  } finally {
    await db.$disconnect()
  }
}

queryServices()