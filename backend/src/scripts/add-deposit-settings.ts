import { db } from "../db";

async function addDepositSettings() {
  console.log("=== Добавление настроек депозита ===\n");

  try {
    // Настройки депозита
    const settings = [
      {
        key: "deposit_wallet_address",
        value: "TLR6nkrqKbVHPB2VvZfYsHwqJz8wYbZoUd", // Тестовый USDT TRC-20 адрес
        description: "Адрес кошелька для приема депозитов USDT TRC-20"
      },
      {
        key: "min_deposit_amount",
        value: "10",
        description: "Минимальная сумма депозита в USDT"
      },
      {
        key: "deposit_confirmations_required",
        value: "3",
        description: "Количество подтверждений сети для депозита"
      },
      {
        key: "deposit_expiry_minutes",
        value: "60",
        description: "Время истечения депозита в минутах"
      }
    ];

    console.log("Добавление настроек...");
    
    for (const setting of settings) {
      await db.systemConfig.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: {
          key: setting.key,
          value: setting.value
        }
      });
      console.log(`✓ ${setting.key}: ${setting.value}`);
    }

    console.log("\n✅ Настройки депозита успешно добавлены!");

  } catch (error) {
    console.error("\n❌ Ошибка при добавлении настроек:", error);
  } finally {
    await db.$disconnect();
  }
}

addDepositSettings().catch(console.error);