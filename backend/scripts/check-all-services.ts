import { db } from "../src/db"

async function checkAllServices() {
  try {
    // Get all services
    const services = await db.service.findMany({
      orderBy: { name: 'asc' }
    })
    
    console.log("📋 All Services:\n")
    
    services.forEach(service => {
      const icon = service.status === 'RUNNING' ? '🟢' : 
                   service.status === 'STOPPED' ? '🔴' : '🟡'
      console.log(`${icon} ${service.displayName} (${service.name})`)
      console.log(`   Status: ${service.status}`)
      console.log(`   Enabled: ${service.enabled}`)
      console.log(`   Last Tick: ${service.lastTick ? service.lastTick.toLocaleString() : 'Never'}`)
      if (service.lastError) {
        console.log(`   Last Error: ${service.lastError}`)
      }
      console.log("")
    })
    
    // Check service configs
    const configs = await db.serviceConfig.findMany()
    
    console.log("\n📋 Service Configurations:\n")
    configs.forEach(config => {
      console.log(`${config.serviceKey}: ${config.isEnabled ? '✅ Enabled' : '❌ Disabled'}`)
    })
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

checkAllServices()