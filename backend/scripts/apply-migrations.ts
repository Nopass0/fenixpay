#!/usr/bin/env bun
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function applyMigrations() {
  console.log('🔄 Applying database migrations...');
  
  try {
    // First try to apply migrations
    execSync('bunx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migrations applied successfully');
  } catch (error) {
    console.error('❌ Migration failed, trying to resolve...');
    
    // If migrations fail, try to push schema directly
    try {
      console.log('🔄 Attempting direct schema push...');
      execSync('bunx prisma db push --force-reset', { stdio: 'inherit' });
      console.log('✅ Schema pushed successfully');
    } catch (pushError) {
      console.error('❌ Schema push also failed:', pushError);
      throw pushError;
    }
  }
  
  await prisma.$disconnect();
}

applyMigrations().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});