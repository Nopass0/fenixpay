#!/usr/bin/env bun

import { db } from '../src/db';
import { MethodType, Currency, RateSource } from '@prisma/client';

async function ensureMethodsExist() {
  console.log('🔧 Ensuring methods exist...');

  try {
    // Create C2C_RUB_IN method
    const c2cIn = await db.method.upsert({
      where: { code: 'C2C_RUB_IN' },
      update: {},
      create: {
        code: 'C2C_RUB_IN',
        name: 'C2C RUB Прием',
        type: MethodType.c2c,
        currency: Currency.rub,
        commissionPayin: 2.5,
        commissionPayout: 0,
        maxPayin: 500000,
        minPayin: 1000,
        maxPayout: 0,
        minPayout: 0,
        chancePayin: 100,
        chancePayout: 0,
        isEnabled: true,
        rateSource: RateSource.bybit
      }
    });
    console.log('✅ Created/found method:', c2cIn.name);

    // Create SBP_RUB_OUT method
    const sbpOut = await db.method.upsert({
      where: { code: 'SBP_RUB_OUT' },
      update: {},
      create: {
        code: 'SBP_RUB_OUT',
        name: 'СБП RUB Выплата',
        type: MethodType.sbp,
        currency: Currency.rub,
        commissionPayin: 0,
        commissionPayout: 2,
        maxPayin: 0,
        minPayin: 0,
        maxPayout: 300000,
        minPayout: 100,
        chancePayin: 0,
        chancePayout: 100,
        isEnabled: true,
        rateSource: RateSource.bybit
      }
    });
    console.log('✅ Created/found method:', sbpOut.name);

    // Link methods to merchant
    const merchant = await db.merchant.findFirst({ where: { name: 'Test Merchant' } });
    if (merchant) {
      // Link C2C_RUB_IN
      await db.merchantMethod.upsert({
        where: { 
          merchantId_methodId: {
            merchantId: merchant.id,
            methodId: c2cIn.id
          }
        },
        update: { isEnabled: true },
        create: {
          merchantId: merchant.id,
          methodId: c2cIn.id,
          isEnabled: true
        }
      });

      // Link SBP_RUB_OUT
      await db.merchantMethod.upsert({
        where: { 
          merchantId_methodId: {
            merchantId: merchant.id,
            methodId: sbpOut.id
          }
        },
        update: { isEnabled: true },
        create: {
          merchantId: merchant.id,
          methodId: sbpOut.id,
          isEnabled: true
        }
      });

      console.log('✅ Linked methods to merchant');

      // Link methods to trader
      const trader = await db.user.findFirst({ where: { email: 'trader@test.com' } });
      if (trader) {
        // Link C2C_RUB_IN to trader
        await db.traderMerchant.upsert({
          where: {
            traderId_merchantId_methodId: {
              traderId: trader.id,
              merchantId: merchant.id,
              methodId: c2cIn.id
            }
          },
          update: {},
          create: {
            traderId: trader.id,
            merchantId: merchant.id,
            methodId: c2cIn.id,
            feeIn: 1.5,
            feeOut: 0
          }
        });

        // Link SBP_RUB_OUT to trader
        await db.traderMerchant.upsert({
          where: {
            traderId_merchantId_methodId: {
              traderId: trader.id,
              merchantId: merchant.id,
              methodId: sbpOut.id
            }
          },
          update: {},
          create: {
            traderId: trader.id,
            merchantId: merchant.id,
            methodId: sbpOut.id,
            feeIn: 0,
            feeOut: 1.2
          }
        });

        console.log('✅ Linked methods to trader');
      }
    }

    console.log('✅ All methods configured successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

ensureMethodsExist();