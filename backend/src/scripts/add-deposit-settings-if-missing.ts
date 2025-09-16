import { db } from "@/db";

async function addDepositSettingsIfMissing() {
  console.log("=== Ensuring Deposit Settings Exist ===");

  const settings = [
    { 
      key: "deposit_wallet_address", 
      value: "TBPx1234567890abcdefghijklmnopqrst",
      description: "USDT TRC-20 wallet address for deposits"
    },
    { 
      key: "min_deposit_amount", 
      value: "10",
      description: "Minimum deposit amount in USDT"
    },
    { 
      key: "deposit_confirmations_required", 
      value: "3",
      description: "Number of confirmations required"
    },
    { 
      key: "deposit_expiry_minutes", 
      value: "60",
      description: "Deposit expiry time in minutes"
    }
  ];

  for (const setting of settings) {
    try {
      await db.systemConfig.upsert({
        where: { key: setting.key },
        create: {
          key: setting.key,
          value: setting.value
        },
        update: {
          // Don't update value if it already exists
        }
      });
      
      const current = await db.systemConfig.findUnique({
        where: { key: setting.key }
      });
      
      console.log(`✓ ${setting.key}: ${current?.value || 'NOT FOUND'}`);
    } catch (error) {
      console.error(`✗ Failed to upsert ${setting.key}:`, error);
    }
  }

  // Verify all settings exist
  console.log("\n=== Verifying All Settings ===");
  const allSettings = await db.systemConfig.findMany({
    where: {
      key: {
        in: settings.map(s => s.key)
      }
    }
  });

  console.log(`Found ${allSettings.length} out of ${settings.length} required settings`);
  
  if (allSettings.length < settings.length) {
    console.error("⚠️  Some settings are missing!");
  } else {
    console.log("✅ All deposit settings are configured!");
  }
}

addDepositSettingsIfMissing()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());