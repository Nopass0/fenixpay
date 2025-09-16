#!/usr/bin/env bun

import { db } from '../src/db';

async function checkMerchantToken() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: 'Test Merchant' }
    });

    if (merchant) {
      console.log('Merchant found:');
      console.log('- Name:', merchant.name);
      console.log('- Token:', merchant.token);
      console.log('- ID:', merchant.id);
    } else {
      console.log('Merchant not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkMerchantToken();