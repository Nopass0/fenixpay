#!/usr/bin/env bun
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFailedMigration() {
  console.log('🔧 Fixing failed migration...');
  
  try {
    // Mark the failed migration as completed
    const result = await prisma.$executeRaw`
      UPDATE "_prisma_migrations" 
      SET finished_at = NOW(), 
          applied_steps_count = 1
      WHERE migration_name = '20250711000001_add_admin_log' 
      AND finished_at IS NULL
    `;
    
    console.log(`✅ Updated ${result} migration record(s)`);
    
    // Verify the fix
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, started_at, finished_at 
      FROM "_prisma_migrations" 
      WHERE migration_name = '20250711000001_add_admin_log'
    `;
    
    console.log('Current state:', migrations);
    
  } catch (error) {
    console.error('❌ Failed to fix migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixFailedMigration().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});