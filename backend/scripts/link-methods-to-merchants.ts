#!/usr/bin/env bun

import { db } from '../src/db';

async function linkMethodsToMerchants() {
  console.log('🔗 Linking methods to merchants...');

  try {
    // Get all merchants
    const merchants = await db.merchant.findMany();
    
    // Get methods
    const methods = await db.method.findMany({
      where: { isEnabled: true }
    });

    console.log(`📊 Found ${merchants.length} merchants and ${methods.length} methods`);

    for (const merchant of merchants) {
      console.log(`\n💼 Processing ${merchant.name}...`);
      
      for (const method of methods) {
        // Check if already linked
        const existing = await db.merchantMethod.findUnique({
          where: {
            merchantId_methodId: {
              merchantId: merchant.id,
              methodId: method.id
            }
          }
        });

        if (!existing) {
          await db.merchantMethod.create({
            data: {
              merchantId: merchant.id,
              methodId: method.id,
              isEnabled: true
            }
          });
          console.log(`   ✅ Linked ${method.name} to ${merchant.name}`);
        } else {
          console.log(`   ⏩ ${method.name} already linked`);
        }
      }
    }

    console.log('\n🎉 All merchants now have methods!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

linkMethodsToMerchants();