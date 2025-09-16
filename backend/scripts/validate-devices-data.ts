import { db } from "../src/db"

async function validateDevicesData() {
  try {
    console.log("🔍 Validating devices data consistency...\n")
    
    // 1. Check for devices with missing required fields
    console.log("📱 Checking devices integrity...")
    const devices = await db.device.findMany({
      include: {
        user: true,
        bankDetails: true
      }
    })
    
    let issues = 0
    
    devices.forEach(device => {
      const problems = []
      
      if (!device.id) problems.push("Missing ID")
      if (!device.name) problems.push("Missing name")
      if (!device.userId) problems.push("Missing userId")
      if (!device.user) problems.push("User not found")
      if (!device.token) problems.push("Missing token")
      
      if (problems.length > 0) {
        issues++
        console.log(`\n❌ Device issues: ${device.name || 'Unknown'} (${device.id})`)
        problems.forEach(p => console.log(`   - ${p}`))
      }
    })
    
    if (issues === 0) {
      console.log("✅ All devices have valid data")
    }
    
    // 2. Check for duplicate tokens
    console.log("\n🔑 Checking for duplicate tokens...")
    const tokens = devices.map(d => d.token).filter(Boolean)
    const uniqueTokens = new Set(tokens)
    
    if (tokens.length !== uniqueTokens.size) {
      console.log("❌ Duplicate tokens found!")
      const tokenCounts = {}
      tokens.forEach(token => {
        tokenCounts[token] = (tokenCounts[token] || 0) + 1
      })
      Object.entries(tokenCounts)
        .filter(([_, count]) => count > 1)
        .forEach(([token, count]) => {
          console.log(`   Token ${token.substring(0, 20)}... appears ${count} times`)
        })
    } else {
      console.log("✅ All tokens are unique")
    }
    
    // 3. Check for orphaned bank details
    console.log("\n🏦 Checking bank details...")
    const bankDetails = await db.bankDetail.findMany({
      include: {
        device: true
      }
    })
    
    const orphanedBankDetails = bankDetails.filter(bd => bd.deviceId && !bd.device)
    if (orphanedBankDetails.length > 0) {
      console.log(`❌ Found ${orphanedBankDetails.length} orphaned bank details`)
      orphanedBankDetails.forEach(bd => {
        console.log(`   - ${bd.recipientName} references non-existent device: ${bd.deviceId}`)
      })
    } else {
      console.log("✅ All bank details have valid device references")
    }
    
    // 4. Check session validity
    console.log("\n🔐 Checking active sessions...")
    const sessions = await db.session.findMany({
      where: {
        expiredAt: { gt: new Date() }
      },
      include: {
        user: true
      }
    })
    
    console.log(`Found ${sessions.length} active sessions`)
    sessions.forEach(session => {
      console.log(`   - ${session.user.email}: expires ${session.expiredAt}`)
    })
    
    // 5. Summary
    console.log("\n📊 Summary:")
    console.log(`   Total devices: ${devices.length}`)
    console.log(`   Devices with issues: ${issues}`)
    console.log(`   Total bank details: ${bankDetails.length}`)
    console.log(`   Orphaned bank details: ${orphanedBankDetails.length}`)
    console.log(`   Active sessions: ${sessions.length}`)
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

validateDevicesData()