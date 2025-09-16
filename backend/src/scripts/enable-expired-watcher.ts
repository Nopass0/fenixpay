#!/usr/bin/env bun
import { db } from '../db';

async function enableExpiredWatcher() {
  try {
    // Проверяем, существует ли сервис в БД
    const existingService = await db.service.findUnique({
      where: { name: 'ExpiredTransactionWatcher' }
    });

    if (existingService) {
      // Обновляем существующий сервис
      const updated = await db.service.update({
        where: { name: 'ExpiredTransactionWatcher' },
        data: {
          enabled: true,
          status: 'RUNNING',
          interval: 10000, // 10 секунд
          displayName: 'Наблюдатель просроченных транзакций',
          description: 'Автоматически отмечает просроченные транзакции и размораживает средства трейдеров'
        }
      });
      console.log('✅ ExpiredTransactionWatcher service updated and enabled:', updated);
    } else {
      // Создаем новый сервис
      const created = await db.service.create({
        data: {
          name: 'ExpiredTransactionWatcher',
          displayName: 'Наблюдатель просроченных транзакций',
          description: 'Автоматически отмечает просроченные транзакции и размораживает средства трейдеров',
          enabled: true,
          status: 'RUNNING',
          interval: 10000, // 10 секунд
          maxLogs: 2500
        }
      });
      console.log('✅ ExpiredTransactionWatcher service created and enabled:', created);
    }

    // Проверяем текущие просроченные транзакции
    const now = new Date();
    const expiredCount = await db.transaction.count({
      where: {
        expired_at: { lt: now },
        status: 'IN_PROGRESS'
      }
    });

    console.log(`\n📊 Current expired transactions: ${expiredCount}`);
    
    if (expiredCount > 0) {
      console.log('⚠️  These transactions will be processed within 10 seconds');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

enableExpiredWatcher();