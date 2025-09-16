import { db } from "../src/db"

async function checkServiceLogs() {
  try {
    // Get recent service logs
    // First find the service
    const service = await db.service.findUnique({
      where: { name: "DeviceEmulatorService" }
    })
    
    if (!service) {
      console.log("Device emulator service not found")
      return
    }
    
    const logs = await db.serviceLog.findMany({
      where: {
        serviceId: service.id,
        createdAt: {
          gte: new Date(Date.now() - 1 * 60 * 1000) // Last 1 minute
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    
    console.log(`📋 Device Emulator Service Logs (last 10 minutes):\n`)
    
    if (logs.length === 0) {
      console.log("No logs found in the last 5 minutes")
    } else {
      logs.forEach(log => {
        const icon = log.level === 'ERROR' ? '❌' : 
                     log.level === 'WARN' ? '⚠️' : 
                     log.level === 'INFO' ? 'ℹ️' : '🔍'
        console.log(`${icon} [${log.createdAt.toLocaleTimeString()}] ${log.level}: ${log.message}`)
        if (log.data) {
          console.log(`   Data: ${JSON.stringify(log.data, null, 2)}`)
        }
      })
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

checkServiceLogs()