import { db } from "../db";

async function cleanDatabase() {
  console.log("=== Очистка базы данных (кроме администратора) ===\n");

  try {
    console.log("🔍 Поиск администратора...");
    const admins = await db.admin.findMany();
    console.log(`   Найдено администраторов: ${admins.length}`);

    console.log("\n🗑️  Удаление данных...");

    // Удаляем в правильном порядке чтобы не нарушить внешние ключи
    
    console.log("   - Удаление сообщений споров...");
    await db.dealDisputeMessage.deleteMany({});
    await db.withdrawalDisputeMessage.deleteMany({});
    
    console.log("   - Удаление споров...");
    await db.dealDispute.deleteMany({});
    await db.withdrawalDispute.deleteMany({});
    
    console.log("   - Удаление транзакций...");
    await db.transaction.deleteMany({});
    
    console.log("   - Удаление выплат...");
    await db.payout.deleteMany({});
    await db.agentPayout.deleteMany({});
    
    console.log("   - Удаление уведомлений...");
    await db.notification.deleteMany({});
    
    console.log("   - Удаление сообщений...");
    await db.message.deleteMany({});
    
    console.log("   - Удаление поддержки...");
    await db.supportTicket.deleteMany({});
    
    console.log("   - Удаление финансовых операций...");
    await db.balanceTopUp.deleteMany({});
    await db.withdrawalRequest.deleteMany({});
    await db.depositRequest.deleteMany({});
    await db.walletCreationRequest.deleteMany({});
    
    console.log("   - Удаление устройств...");
    await db.deviceCheckResult.deleteMany({});
    await db.device.deleteMany({});
    
    console.log("   - Удаление банковских реквизитов...");
    await db.bankDetail.deleteMany({});
    
    console.log("   - Удаление криптокошельков...");
    await db.cryptoWallet.deleteMany({});
    
    console.log("   - Удаление папок...");
    await db.folder.deleteMany({});
    
    console.log("   - Удаление сессий...");
    await db.session.deleteMany({});
    await db.agentSession.deleteMany({});
    await db.merchantSession.deleteMany({});
    
    console.log("   - Удаление связей трейдер-мерчант...");
    await db.traderMerchant.deleteMany({});
    
    console.log("   - Удаление связей агент-трейдер...");
    await db.agentTrader.deleteMany({});
    
    console.log("   - Удаление методов мерчантов...");
    await db.merchantMethod.deleteMany({});
    
    console.log("   - Удаление мерчантов...");
    await db.merchant.deleteMany({});
    
    console.log("   - Удаление пользователей (трейдеров)...");
    await db.user.deleteMany({});
    
    console.log("   - Удаление команд...");
    await db.team.deleteMany({});
    
    console.log("   - Удаление агентов...");
    await db.agent.deleteMany({});
    
    console.log("   - Удаление методов оплаты...");
    await db.method.deleteMany({});
    
    console.log("   - Удаление системных конфигураций...");
    await db.systemConfig.deleteMany({});
    
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

cleanDatabase().catch(console.error);