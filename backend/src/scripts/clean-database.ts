import { db } from "../db";

async function cleanDatabase() {
  console.log("=== Очистка базы данных (кроме администратора) ===\n");

  try {
    console.log("🔍 Поиск администратора...");
    const admins = await db.admin.findMany();
    console.log(`   Найдено администраторов: ${admins.length}`);

    // Начинаем удаление в правильном порядке (сначала зависимые таблицы)
    
    console.log("\n🗑️  Удаление данных...");

    // 1. Удаляем сообщения и уведомления
    console.log("   - Удаление сообщений...");
    await db.message.deleteMany({});
    await db.dealDisputeMessage.deleteMany({});
    await db.withdrawalDisputeMessage.deleteMany({});
    
    console.log("   - Удаление уведомлений...");
    await db.notification.deleteMany({});
    
    // 2. Удаляем споры
    console.log("   - Удаление споров...");
    await db.dealDispute.deleteMany({});
    await db.withdrawalDispute.deleteMany({});
    await db.supportTicket.deleteMany({});
    
    // 3. Удаляем выплаты и связанное
    console.log("   - Удаление выплат...");
    await db.payout.deleteMany({});
    await db.agentPayout.deleteMany({});
    
    // 4. Удаляем транзакции и чеки
    console.log("   - Удаление транзакций и чеков...");
    await db.transactionReceipt.deleteMany({});
    await db.transactionLog.deleteMany({});
    await db.transaction.deleteMany({});
    
    // 5. Удаляем финансовые операции
    console.log("   - Удаление финансовых операций...");
    await db.balanceTopUp.deleteMany({});
    await db.withdrawalRequest.deleteMany({});
    await db.depositRequest.deleteMany({});
    await db.walletCreationRequest.deleteMany({});
    
    // 6. Удаляем устройства и связанное
    console.log("   - Удаление устройств...");
    await db.deviceCheckResult.deleteMany({});
    await db.device.deleteMany({});
    
    // 7. Удаляем реквизиты
    console.log("   - Удаление банковских реквизитов...");
    await db.bankDetail.deleteMany({});
    
    // 8. Удаляем кошельки
    console.log("   - Удаление криптокошельков...");
    await db.cryptoWallet.deleteMany({});
    
    // 9. Удаляем папки
    console.log("   - Удаление папок...");
    await db.folder.deleteMany({});
    
    // 10. Удаляем сессии
    console.log("   - Удаление сессий...");
    await db.session.deleteMany({});
    await db.agentSession.deleteMany({});
    await db.merchantSession.deleteMany({});
    
    // 11. Удаляем связи трейдеров
    console.log("   - Удаление связей трейдеров...");
    await db.traderMerchant.deleteMany({});
    await db.agentTrader.deleteMany({});
    
    // 12. Удаляем методы мерчантов
    console.log("   - Удаление методов мерчантов...");
    await db.merchantMethod.deleteMany({});
    
    // 13. Удаляем мерчантов
    console.log("   - Удаление мерчантов...");
    await db.merchant.deleteMany({});
    
    // 14. Удаляем пользователей (трейдеров)
    console.log("   - Удаление пользователей...");
    await db.user.deleteMany({});
    
    // 15. Удаляем команды
    console.log("   - Удаление команд...");
    await db.team.deleteMany({});
    
    // 16. Удаляем агентов
    console.log("   - Удаление агентов...");
    await db.agent.deleteMany({});
    
    // 17. Удаляем методы оплаты
    console.log("   - Удаление методов оплаты...");
    await db.method.deleteMany({});
    
    // 18. Удаляем системные конфигурации
    console.log("   - Удаление системных конфигураций...");
    await db.systemConfig.deleteMany({});
    
    // 19. Удаляем миграции приложений
    console.log("   - Удаление миграций приложений...");
    await db.appMigration.deleteMany({});
    
    console.log("\n✅ База данных очищена!");
    console.log(`   Оставлено администраторов: ${admins.length}`);
    for (const admin of admins) {
      console.log(`   - ${admin.email} (${admin.role})`);
    }

  } catch (error) {
    console.error("\n❌ Ошибка при очистке базы данных:", error);
  } finally {
    await db.$disconnect();
  }
}

// Запрашиваем подтверждение
console.log("⚠️  ВНИМАНИЕ: Эта операция удалит ВСЕ данные из базы данных кроме администраторов!");
console.log("   Это действие НЕОБРАТИМО!");
console.log("");
console.log("   Для продолжения введите 'YES' и нажмите Enter:");

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('> ', (answer: string) => {
  if (answer.trim() === 'YES') {
    cleanDatabase().catch(console.error);
  } else {
    console.log("Операция отменена.");
    process.exit(0);
  }
  rl.close();
});