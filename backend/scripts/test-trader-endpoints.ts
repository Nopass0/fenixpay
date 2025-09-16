import { db } from "@/db"

async function testTraderEndpoints() {
  try {
    console.log("🔍 Testing trader endpoints...")

    // Get a trader session token
    const trader = await db.user.findUnique({
      where: { email: "trader@example.com" },
      include: {
        sessions: {
          where: {
            expiredAt: { gt: new Date() }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!trader) {
      console.log("❌ trader@example.com not found")
      
      // Create the trader
      console.log("Creating trader@example.com...")
      const newTrader = await db.user.create({
        data: {
          email: "trader@example.com",
          password: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92", // "123456"
          name: "Test Trader",
          balanceUsdt: 10000,
          balanceRub: 0,
          trustBalance: 10000
        }
      })
      console.log("✅ Created trader@example.com")
      
      // Create a session
      const session = await db.session.create({
        data: {
          userId: newTrader.id,
          token: `test-session-${Date.now()}`,
          ip: "127.0.0.1",
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      })
      console.log("✅ Created session:", session.token)
      
      return
    }

    const session = trader.sessions[0]
    if (!session) {
      console.log("❌ No active session found for trader@example.com")
      
      // Create a new session
      const newSession = await db.session.create({
        data: {
          userId: trader.id,
          token: `test-session-${Date.now()}`,
          ip: "127.0.0.1",
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      })
      console.log("✅ Created new session:", newSession.token)
      return
    }

    console.log("✅ Found trader session:", session.token)

    // Test endpoints
    const baseUrl = "http://localhost:3000/api/trader"
    const headers = {
      "x-trader-token": session.token,
      "Content-Type": "application/json"
    }

    // 1. Test bank-details endpoint (this is likely the "getRequisites" endpoint)
    console.log("\n📝 Testing GET /bank-details...")
    try {
      const response = await fetch(`${baseUrl}/bank-details`, { headers })
      console.log("Response status:", response.status)
      
      if (response.status === 422) {
        console.log("❌ Got 422 error - validation issue")
        const errorText = await response.text()
        console.log("Error response:", errorText)
      } else {
        const data = await response.json()
        console.log("✅ Bank details fetched successfully:", data.length, "items")
      }
    } catch (error) {
      console.error("❌ Error fetching bank details:", error)
    }

    // 2. Test profile endpoint
    console.log("\n👤 Testing GET /profile...")
    try {
      const response = await fetch(`${baseUrl}/profile`, { headers })
      const data = await response.json()
      console.log("✅ Profile:", data)
    } catch (error) {
      console.error("❌ Error fetching profile:", error)
    }

    // 3. Test devices endpoint
    console.log("\n📱 Testing GET /devices...")
    try {
      const response = await fetch(`${baseUrl}/devices`, { headers })
      const data = await response.json()
      console.log("✅ Devices:", data.length, "items")
    } catch (error) {
      console.error("❌ Error fetching devices:", error)
    }

  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

testTraderEndpoints()