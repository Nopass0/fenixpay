import { db } from '../src/db'

async function createMissingTables() {
  try {
    // Try to create AgentTrader table directly using raw SQL
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AgentTrader" (
        "id" TEXT NOT NULL,
        "agentId" TEXT NOT NULL,
        "traderId" TEXT NOT NULL,
        "teamId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AgentTrader_pkey" PRIMARY KEY ("id")
      );
    `;

    await db.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "AgentTrader_agentId_traderId_key" ON "AgentTrader"("agentId", "traderId");
    `;

    // Create Agent table
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Agent" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "trcWallet" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
      );
    `;

    await db.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Agent_email_key" ON "Agent"("email");
    `;

    // Create Team table
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Team" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "agentId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
      );
    `;

    await db.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Team_agentId_name_key" ON "Team"("agentId", "name");
    `;

    console.log('✓ Created missing tables successfully')
  } catch (error) {
    console.error('Error creating tables:', error)
  }
}

createMissingTables()