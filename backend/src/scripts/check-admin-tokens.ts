import { db } from "../db";

async function checkAdminTokens() {
  console.log("Checking admin tokens in database...\n");

  // Get all admin tokens
  const admins = await db.admin.findMany({
    select: {
      id: true,
      token: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${admins.length} admin(s) in database:\n`);
  
  admins.forEach((admin, index) => {
    console.log(`Admin ${index + 1}:`);
    console.log(`  ID: ${admin.id}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  Token: ${admin.token}`);
    console.log(`  Created: ${admin.createdAt}`);
    console.log('');
  });

  // Also check master key from environment
  console.log("Environment keys:");
  console.log(`  SUPER_ADMIN_KEY from env: ${process.env.SUPER_ADMIN_KEY || 'Not set'}`);
  console.log(`  Current master key: ${process.env.SUPER_ADMIN_KEY || 'Dynamic key generated'}`);
}

checkAdminTokens().catch(console.error).finally(() => process.exit(0));