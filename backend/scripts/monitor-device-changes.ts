import { db } from "../src/db"

async function monitorDeviceChanges() {
  try {
    console.log("👁️  Starting device monitoring for trader@example.com...\n")
    console.log("Press Ctrl+C to stop monitoring\n")
    
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    let previousDevices: any[] = []
    let checkCount = 0
    
    const checkDevices = async () => {
      checkCount++
      
      const currentDevices = await db.device.findMany({
        where: { userId: trader.id },
        select: {
          id: true,
          name: true,
          token: true,
          isOnline: true,
          emulated: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      // Проверяем изменения
      const currentCount = currentDevices.length
      const previousCount = previousDevices.length
      
      if (currentCount !== previousCount) {
        console.log(`\n🔄 [${new Date().toISOString()}] Device count changed!`)
        console.log(`   Previous: ${previousCount} devices`)
        console.log(`   Current: ${currentCount} devices`)
        
        if (currentCount > previousCount) {
          // Устройства добавлены
          const newDevices = currentDevices.filter(
            current => !previousDevices.find(prev => prev.id === current.id)
          )
          newDevices.forEach(device => {
            console.log(`   ➕ Added: ${device.name} (${device.id})`)
          })
        }
        
        if (currentCount < previousCount) {
          // Устройства удалены
          const deletedDevices = previousDevices.filter(
            prev => !currentDevices.find(current => current.id === prev.id)
          )
          deletedDevices.forEach(device => {
            console.log(`   ➖ Deleted: ${device.name} (${device.id})`)
          })
        }
      } else if (checkCount % 10 === 0) {
        // Каждые 10 проверок показываем статус
        console.log(`[${new Date().toISOString()}] Status: ${currentCount} devices (check #${checkCount})`)
      }
      
      // Проверяем изменения в существующих устройствах
      currentDevices.forEach(current => {
        const previous = previousDevices.find(prev => prev.id === current.id)
        if (previous) {
          if (current.isOnline !== previous.isOnline) {
            console.log(`   🔄 ${current.name}: ${previous.isOnline ? 'online' : 'offline'} → ${current.isOnline ? 'online' : 'offline'}`)
          }
          if (current.updatedAt !== previous.updatedAt) {
            console.log(`   📝 ${current.name}: updated at ${current.updatedAt}`)
          }
        }
      })
      
      previousDevices = currentDevices
    }
    
    // Первоначальная проверка
    await checkDevices()
    
    // Запускаем мониторинг каждые 2 секунды
    const interval = setInterval(checkDevices, 2000)
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping device monitoring...')
      clearInterval(interval)
      db.$disconnect()
      process.exit(0)
    })
    
    // Держим процесс запущенным
    await new Promise(() => {})
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

monitorDeviceChanges()