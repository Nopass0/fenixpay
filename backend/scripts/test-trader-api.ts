#!/usr/bin/env bun

const TOKEN = "5872cb3c8d38aa6fd4c2bb1640f101f66ae4f320c38e06cfb7f8c5e705423783";

async function testAPI(endpoint: string, expectedDesc: string) {
  try {
    const response = await fetch(`http://localhost:3000/api/trader${endpoint}`, {
      headers: {
        'x-trader-token': TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`\n✅ ${expectedDesc} (${endpoint}):`);
    
    if (Array.isArray(data)) {
      console.log(`   Count: ${data.length}`);
      if (data.length > 0) {
        console.log(`   Sample:`, JSON.stringify(data[0], null, 2));
      }
    } else {
      console.log(`   Data:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`\n❌ ${expectedDesc} (${endpoint}): ${error}`);
  }
}

async function main() {
  console.log('🔍 Testing Trader API endpoints...\n');
  
  await testAPI('/profile', 'Profile');
  await testAPI('/transactions', 'Transactions');
  await testAPI('/devices', 'Devices');
  await testAPI('/bank-details', 'Bank Details');
  await testAPI('/folders', 'Folders');
  await testAPI('/messages', 'Messages');
  await testAPI('/payouts', 'Payouts');
  await testAPI('/dashboard/stats', 'Dashboard Stats');
}

main();