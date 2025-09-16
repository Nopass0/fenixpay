import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

async function patchEmulatorService() {
  try {
    console.log("🔧 Patching Device Emulator Service for separate notification interval...\n")
    
    const filePath = join(process.cwd(), 'src/services/DeviceEmulatorService.ts')
    let content = readFileSync(filePath, 'utf-8')
    
    // Check if already patched
    if (content.includes('notifyIntervalSec')) {
      console.log("✅ Service already patched for separate notification interval")
      return
    }
    
    // Find the line where notification coroutine is started
    const notificationCoroutinePattern = /state\.notificationCoroutine = setInterval\(\(\) => \{\s*this\.runNotificationTask\(deviceCode, config\)\s*\}, pingSec \* 1000\)/
    
    if (!notificationCoroutinePattern.test(content)) {
      console.log("❌ Could not find notification coroutine pattern to patch")
      console.log("   Looking for the startDevice method...")
      
      // Alternative approach - show current implementation
      const startDeviceIndex = content.indexOf('private async startDevice(')
      if (startDeviceIndex !== -1) {
        const methodEnd = content.indexOf('}', content.indexOf('{', startDeviceIndex))
        const methodContent = content.substring(startDeviceIndex, methodEnd + 1)
        console.log("\nCurrent startDevice method:")
        console.log(methodContent.split('\n').slice(0, 15).join('\n') + '...')
      }
      return
    }
    
    // Replace with separate interval
    content = content.replace(
      notificationCoroutinePattern,
      `// Use separate interval for notifications (more frequent than pings)
    const notifyIntervalSec = (config as any).notifyIntervalSec || Math.min(pingSec / 2, 20)
    state.notificationCoroutine = setInterval(() => {
      this.runNotificationTask(deviceCode, config)
    }, notifyIntervalSec * 1000)`
    )
    
    // Write the patched file
    writeFileSync(filePath, content)
    
    console.log("✅ Successfully patched Device Emulator Service!")
    console.log("   Notifications will now use a separate, more frequent interval")
    console.log("   Default: min(pingSec/2, 20) seconds")
    console.log("\n⚠️  The server needs to be restarted for changes to take effect")
    
  } catch (error) {
    console.error("❌ Error patching service:", error)
  }
}

patchEmulatorService()