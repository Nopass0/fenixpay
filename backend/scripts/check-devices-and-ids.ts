import { db } from "../src/db"

async function checkDevicesAndIds() {
  try {
    console.log("🔍 Checking all devices in database...\n")
    
    // Get all devices with their users
    const devices = await db.device.findMany({
      include: {
        user: true,
        bankDetails: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📱 Found ${devices.length} devices:\n`)
    
    devices.forEach((device, index) => {
      console.log(`${index + 1}. Device: ${device.name}`)
      console.log(`   ID: ${device.id}`)
      console.log(`   Token: ${device.token?.substring(0, 20)}...`)
      console.log(`   User: ${device.user.email} (ID: ${device.userId})`)
      console.log(`   Online: ${device.isOnline}`)
      console.log(`   Bank Details: ${device.bankDetails.length}`)
      console.log(`   Created: ${device.createdAt}`)
      console.log("")
    })
    
    // Check trader user
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" }
    })
    
    if (trader) {
      console.log(`\n🔍 Trader (${trader.email}) devices:`)
      const traderDevices = devices.filter(d => d.userId === trader.id)
      if (traderDevices.length > 0) {
        traderDevices.forEach(d => {
          console.log(`   - ${d.name} (ID: ${d.id})`)
        })
      } else {
        console.log("   ❌ No devices found for this trader")
      }
    }
    
    // Test the API endpoint
    if (devices.length > 0 && trader) {
      const testDevice = devices.find(d => d.userId === trader.id)
      if (testDevice) {
        console.log(`\n🧪 Testing API endpoint for device: ${testDevice.id}`)
        
        // Find active session
        const session = await db.session.findFirst({
          where: {
            userId: trader.id,
            expiredAt: { gt: new Date() }
          }
        })
        
        if (session) {
          try {
            const response = await fetch(`http://localhost:3000/api/trader/devices/${testDevice.id}`, {
              headers: {
                'x-trader-token': session.token
              }
            })
            
            if (response.ok) {
              console.log("✅ API call successful")
              const data = await response.json()
              console.log(`   Device name: ${data.name}`)
              console.log(`   Online: ${data.isOnline}`)
            } else {
              console.log(`❌ API call failed: ${response.status} ${response.statusText}`)
              const error = await response.text()
              console.log(`   Error: ${error}`)
            }
          } catch (error) {
            console.log(`❌ API call error: ${error.message}`)
          }
        } else {
          console.log("⚠️  No active session for trader")
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

checkDevicesAndIds()