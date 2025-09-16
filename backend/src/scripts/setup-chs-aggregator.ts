import { db } from "@/db";

async function setupChsAggregator() {
  try {
    // Найти агрегатор chs по email
    const chsAggregator = await db.aggregator.findFirst({
      where: {
        OR: [
          { email: 'qq@q.q' },
          { name: 'chs' }
        ]
      }
    });

    if (!chsAggregator) {
      console.log("Агрегатор 'chs' с email qq@q.q не найден. Создаем...");

      const newAggregator = await db.aggregator.create({
        data: {
          email: 'qq@q.q',
          password: '$2a$10$K1234567890abcdefghijklmnopqrstuvwxyz123456789', // Should be properly hashed
          name: 'chs',
          apiToken: `chs_api_${Date.now()}`,
          callbackToken: `chs_callback_${Date.now()}`,
          apiBaseUrl: 'https://chasepay.pro/api',
          maxSlaMs: 4000, // 4 seconds timeout
          isActive: true,
          balanceUsdt: 10000,
          depositUsdt: 1000,
          isChaseProject: true,
          isChaseCompatible: true,
          requiresInsuranceDeposit: false
        }
      });

      console.log(`✅ Создан агрегатор: ${newAggregator.name}`);
      console.log(`   ID: ${newAggregator.id}`);
      console.log(`   Email: ${newAggregator.email}`);
      console.log(`   API URL: ${newAggregator.apiBaseUrl}`);
      console.log(`   Timeout: ${newAggregator.maxSlaMs}ms`);

      // Создаем связи с мерчантами
      const merchants = await db.merchant.findMany();
      const methods = await db.method.findMany();

      for (const merchant of merchants) {
        for (const method of methods) {
          try {
            await db.aggregatorMerchant.create({
              data: {
                aggregatorId: newAggregator.id,
                merchantId: merchant.id,
                methodId: method.id,
                feeIn: 2.0,
                feeOut: 1.5,
                isFeeInEnabled: true,
                isFeeOutEnabled: true,
                isTrafficEnabled: true,
                useFlexibleRates: false
              }
            });
            console.log(`   ✅ Связь: ${merchant.name} <-> ${method.code}`);
          } catch (e) {
            // Ignore duplicate errors
          }
        }
      }

    } else {
      console.log(`Найден агрегатор: ${chsAggregator.name}`);
      console.log(`   ID: ${chsAggregator.id}`);
      console.log(`   Email: ${chsAggregator.email}`);
      console.log(`   API URL: ${chsAggregator.apiBaseUrl}`);
      console.log(`   Timeout: ${chsAggregator.maxSlaMs}ms`);
      console.log(`   Balance: ${chsAggregator.balanceUsdt} USDT`);
      console.log(`   Deposit: ${chsAggregator.depositUsdt} USDT`);

      // Обновляем настройки если нужно
      const updates: any = {};

      if (!chsAggregator.apiBaseUrl) {
        updates.apiBaseUrl = 'https://chasepay.pro/api';
        console.log("   ⚠️ URL не установлен, обновляем на https://chasepay.pro/api");
      }

      if (!chsAggregator.maxSlaMs || chsAggregator.maxSlaMs < 4000) {
        updates.maxSlaMs = 4000;
        console.log(`   ⚠️ Timeout ${chsAggregator.maxSlaMs}ms слишком маленький, обновляем на 4000ms`);
      }

      if (!chsAggregator.isActive) {
        updates.isActive = true;
        console.log("   ⚠️ Агрегатор неактивен, активируем");
      }

      if (Object.keys(updates).length > 0) {
        await db.aggregator.update({
          where: { id: chsAggregator.id },
          data: {
            ...updates,
            isChaseProject: true,
            isChaseCompatible: true
          }
        });
        console.log("   ✅ Настройки обновлены");
      }

      // Проверяем связи с мерчантами
      const relations = await db.aggregatorMerchant.count({
        where: { aggregatorId: chsAggregator.id }
      });

      console.log(`   Связей с мерчантами: ${relations}`);

      if (relations === 0) {
        console.log("   Создаем связи с мерчантами...");
        const merchants = await db.merchant.findMany();
        const methods = await db.method.findMany();

        for (const merchant of merchants) {
          for (const method of methods) {
            try {
              await db.aggregatorMerchant.create({
                data: {
                  aggregatorId: chsAggregator.id,
                  merchantId: merchant.id,
                  methodId: method.id,
                  feeIn: 2.0,
                  feeOut: 1.5,
                  isFeeInEnabled: true,
                  isFeeOutEnabled: true,
                  isTrafficEnabled: true,
                  useFlexibleRates: false
                }
              });
              console.log(`   ✅ Связь: ${merchant.name} <-> ${method.code}`);
            } catch (e) {
              // Ignore duplicate errors
            }
          }
        }
      }
    }

    // Показываем финальное состояние
    const finalAggregator = await db.aggregator.findFirst({
      where: {
        OR: [
          { email: 'qq@q.q' },
          { name: 'chs' }
        ]
      },
      include: {
        merchants: true
      }
    });

    console.log("\n=== ФИНАЛЬНАЯ КОНФИГУРАЦИЯ ===");
    console.log(`Агрегатор: ${finalAggregator?.name}`);
    console.log(`   ID: ${finalAggregator?.id}`);
    console.log(`   API URL: ${finalAggregator?.apiBaseUrl}`);
    console.log(`   Активен: ${finalAggregator?.isActive}`);
    console.log(`   Связей с мерчантами: ${finalAggregator?.merchants.length}`);

  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await db.$disconnect();
  }
}

setupChsAggregator();