import { db } from "../db";

async function createAdminToken() {
  const tokenFromBrowser = '84a7ed1e7031d9f549a9d441fa84a0c8375ac008fa1c74806871a1686469d95e';
  
  console.log("Creating new admin with token from browser...");
  
  try {
    const newAdmin = await db.admin.create({
      data: {
        token: tokenFromBrowser,
        role: 'SUPER_ADMIN'
      }
    });
    
    console.log("✅ Successfully created new admin:");
    console.log(`  ID: ${newAdmin.id}`);
    console.log(`  Token: ${newAdmin.token}`);
    console.log(`  Role: ${newAdmin.role}`);
    console.log("\nYou can now use this token to access the admin panel!");
    
  } catch (error) {
    console.error("❌ Failed to create admin:", error);
  }
}

createAdminToken().catch(console.error).finally(() => process.exit(0));