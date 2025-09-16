import { db } from "@/db";

async function getTraderSession() {
  const sessions = await db.session.findMany({
    where: {
      expiredAt: {
        gt: new Date()
      }
    },
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });

  console.log("Active trader sessions:");
  sessions.forEach(session => {
    console.log(`\nTrader: ${session.user.email}`);
    console.log(`Token: ${session.token}`);
    console.log(`Expires: ${session.expiredAt}`);
  });

  if (sessions.length === 0) {
    console.log("\nNo active sessions found. Creating a test session...");
    
    // Find or create a test trader
    let trader = await db.user.findFirst({
      where: { email: "test@trader.com" }
    });

    if (!trader) {
      trader = await db.user.create({
        data: {
          email: "test@trader.com",
          password: "password123",
          name: "Test Trader"
        }
      });
    }

    // Create a session
    const session = await db.session.create({
      data: {
        userId: trader.id,
        token: `test-trader-token-${Date.now()}`,
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    console.log(`\nCreated test session:`);
    console.log(`Trader: ${trader.email}`);
    console.log(`Token: ${session.token}`);
  }
}

getTraderSession().catch(console.error).finally(() => process.exit(0));