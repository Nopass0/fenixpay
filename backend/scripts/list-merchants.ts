import { db } from '../src/db';

async function listMerchants() {
  try {
    console.log('📋 Listing all merchants in the database...\n');
    
    const merchants = await db.merchant.findMany({
      select: {
        id: true,
        name: true,
        token: true,
        disabled: true,
        banned: true,
        balanceUsdt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (merchants.length === 0) {
      console.log('❌ No merchants found in the database');
      console.log('\nYou can create test merchants by running:');
      console.log('- bun scripts/seed-dev.ts (creates test-merchant-token)');
      console.log('- bun scripts/setup-payout-test.ts (creates test-payout-merchant)');
      return;
    }
    
    console.log(`Found ${merchants.length} merchant(s):\n`);
    
    merchants.forEach((merchant, index) => {
      console.log(`${index + 1}. ${merchant.name}`);
      console.log(`   ID: ${merchant.id}`);
      console.log(`   Token: ${merchant.token}`);
      console.log(`   Balance USDT: ${merchant.balanceUsdt}`);
      console.log(`   Status: ${merchant.disabled ? '❌ Disabled' : merchant.banned ? '🚫 Banned' : '✅ Active'}`);
      console.log(`   Created: ${merchant.createdAt.toLocaleString()}`);
      console.log('');
    });
    
    console.log('\n💡 To use a merchant for creating payouts:');
    console.log('- Use the merchant token as API key in the x-api-key header');
    console.log('- Make sure the merchant has sufficient USDT balance');
    console.log('- Ensure the merchant is active (not disabled or banned)');
    
  } catch (error) {
    console.error('❌ Error listing merchants:', error);
  } finally {
    await db.$disconnect();
  }
}

listMerchants();