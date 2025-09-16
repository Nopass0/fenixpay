import { db } from "../db";

async function cleanDatabase() {
  console.log("=== Очистка всех данных кроме администраторов ===\n");

  try {
    // Сохраняем администраторов
    console.log("📌 Сохранение администраторов...");
    const admins = await db.admin.findMany();
    console.log(`   Найдено администраторов: ${admins.length}`);

    console.log("\n🗑️  Начинаем очистку данных...\n");

    // Удаляем в правильном порядке для соблюдения внешних ключей
    
    // 1. Сначала удаляем файлы и вложения
    console.log("1. Удаление файлов и вложений...");
    await db.messageAttachment.deleteMany({});
    await db.dealDisputeFile.deleteMany({});
    await db.withdrawalDisputeFile.deleteMany({});
    
    // 2. Удаляем сообщения
    console.log("2. Удаление сообщений...");
    await db.dealDisputeMessage.deleteMany({});
    await db.withdrawalDisputeMessage.deleteMany({});
    await db.supportMessage.deleteMany({});
    await db.message.deleteMany({});
    
    // 3. Удаляем споры и тикеты
    console.log("3. Удаление споров и тикетов поддержки...");
    await db.dealDispute.deleteMany({});
    await db.withdrawalDispute.deleteMany({});
    await db.supportTicket.deleteMany({});
    
    // 4. Удаляем транзакции и связанное
    console.log("4. Удаление транзакций и чеков...");
    await db.receipt.deleteMany({});
    await db.transaction.deleteMany({});
    await db.walletTransaction.deleteMany({});
    await db.masterWalletTransfer.deleteMany({});
    
    // 5. Удаляем выплаты
    console.log("5. Удаление выплат...");
    await db.payoutRateAudit.deleteMany({});
    await db.payout.deleteMany({});
    await db.agentPayout.deleteMany({});
    
    // 6. Удаляем уведомления
    console.log("6. Удаление уведомлений...");
    await db.notification.deleteMany({});
    
    // 7. Удаляем финансовые операции
    console.log("7. Удаление финансовых операций...");
    await db.balanceTopUp.deleteMany({});
    await db.depositRequest.deleteMany({});
    await db.withdrawalRequest.deleteMany({});
    await db.walletCreationRequest.deleteMany({});
    
    // 8. Удаляем логи
    console.log("8. Удаление логов...");
    await db.adminLog.deleteMany({});
    await db.serviceLog.deleteMany({});
    
    // 9. Удаляем устройства
    console.log("9. Удаление устройств...");
    await db.device.deleteMany({});
    
    // 10. Удаляем папки и связи
    console.log("10. Удаление папок...");
    await db.requisiteOnFolder.deleteMany({});
    await db.folder.deleteMany({});
    
    // 11. Удаляем банковские реквизиты
    console.log("11. Удаление банковских реквизитов...");
    await db.bankDetail.deleteMany({});
    
    // 12. Удаляем кошельки
    console.log("12. Удаление кошельков...");
    await db.cryptoWallet.deleteMany({});
    await db.masterWallet.deleteMany({});
    
    // 13. Удаляем сессии
    console.log("13. Удаление сессий...");
    await db.session.deleteMany({});
    await db.agentSession.deleteMany({});
    
    // 14. Удаляем связи
    console.log("14. Удаление связей трейдеров и агентов...");
    await db.traderMerchant.deleteMany({});
    await db.agentTrader.deleteMany({});
    
    // 15. Удаляем методы мерчантов
    console.log("15. Удаление методов мерчантов...");
    await db.merchantMethod.deleteMany({});
    
    // 16. Удаляем расчеты мерчантов
    console.log("16. Удаление расчетов мерчантов...");
    await db.merchantSettlement.deleteMany({});
    
    // 17. Удаляем мерчантов
    console.log("17. Удаление мерчантов...");
    await db.merchant.deleteMany({});
    
    // 18. Удаляем пользователей
    console.log("18. Удаление пользователей (трейдеров)...");
    await db.user.deleteMany({});
    
    // 19. Удаляем команды
    console.log("19. Удаление команд...");
    await db.team.deleteMany({});
    
    // 20. Удаляем агентов
    console.log("20. Удаление агентов...");
    await db.agent.deleteMany({});
    
    // 21. Удаляем методы оплаты
    console.log("21. Удаление методов оплаты...");
    await db.method.deleteMany({});
    
    // 22. Удаляем настройки и конфигурации
    console.log("22. Удаление настроек...");
    await db.systemConfig.deleteMany({});
    await db.rateSettings.deleteMany({});
    await db.rateSetting.deleteMany({});
    await db.topupSettings.deleteMany({});
    await db.serviceConfig.deleteMany({});
    
    // 23. Удаляем сервисы
    console.log("23. Удаление сервисов...");
    await db.service.deleteMany({});
    
    // 24. Удаляем telegram связи
    console.log("24. Удаление telegram связей...");
    await db.telegramLink.deleteMany({});
    
    // 25. Удаляем версии приложений
    console.log("25. Удаление версий приложений...");
    await db.appVersion.deleteMany({});
    
    // 26. Удаляем IP whitelist админов (опционально)
    console.log("26. Удаление IP whitelist...");
    await db.adminIpWhitelist.deleteMany({});

    console.log("\n✅ База данных успешно очищена!");
    console.log(`\n📌 Сохранены администраторы: ${admins.length}`);
    for (const admin of admins) {
      console.log(`   - ${admin.email} (${admin.role})`);
    }

  } catch (error) {
    console.error("\n❌ Ошибка при очистке базы данных:");
    console.error(error);
  } finally {
    await db.$disconnect();
  }
}

// Запускаем очистку
cleanDatabase().catch(console.error);