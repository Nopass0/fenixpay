import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function fixNotificationMatcher() {
  console.log('=== Исправление NotificationMatcherService ===\n');
  
  const filePath = join(process.cwd(), 'src/services/NotificationMatcherService.ts');
  
  try {
    let content = await readFile(filePath, 'utf-8');
    
    // Проблема 1: Берется только первый реквизит, а нужно проверять все
    const oldCode1 = `      // bankDetails is an array, get the first one
      const bankDetails = notification.Device.bankDetails[0];
      const metadata = notification.metadata as any;
      
      // Находим подходящий matcher для банка
      const matcher = this.bankMatchers.find(m => 
        m.packageName === metadata?.packageName &&
        m.bankName === bankDetails.bankType
      );

      if (!matcher) {
        console.log(\`[NotificationMatcherService] No matcher found for \${metadata?.packageName} and \${bankDetails.bankType}\`);
        console.log(\`[NotificationMatcherService] Available matchers: \${this.bankMatchers.map(m => \`\${m.packageName}:\${m.bankName}\`).join(', ')}\`);
        return;
      }`;
    
    const newCode1 = `      const metadata = notification.metadata as any;
      const packageName = metadata?.packageName || notification.application;
      
      // Находим подходящий matcher для пакета приложения
      const matchersForPackage = this.bankMatchers.filter(m => 
        m.packageName === packageName
      );

      if (matchersForPackage.length === 0) {
        console.log(\`[NotificationMatcherService] No matchers found for package \${packageName}\`);
        return;
      }

      // Определяем какой matcher использовать
      let matcher = matchersForPackage[0];
      let matchingBankDetail = null;
      
      // Ищем реквизит с соответствующим банком
      for (const bd of notification.Device.bankDetails) {
        const foundMatcher = matchersForPackage.find(m => m.bankName === bd.bankType);
        if (foundMatcher) {
          matcher = foundMatcher;
          matchingBankDetail = bd;
          break;
        }
      }
      
      if (!matchingBankDetail) {
        // Используем первый реквизит если точное совпадение не найдено
        matchingBankDetail = notification.Device.bankDetails[0];
      }`;
    
    // Проблема 2: Нужно искать транзакции по всем реквизитам устройства
    const oldCode2 = `      // Ищем подходящую транзакцию
      // Сначала ищем точное совпадение
      let transaction = await db.transaction.findFirst({
        where: {
          bankDetailId: bankDetails.id,
          amount: amount,
          type: TransactionType.IN,
          status: {
            in: [Status.CREATED, Status.IN_PROGRESS]
          },
          traderId: bankDetails.userId
        },
        include: {
          merchant: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });`;
    
    const newCode2 = `      // Получаем все ID реквизитов с этого устройства
      const deviceBankDetailIds = notification.Device.bankDetails.map((bd: any) => bd.id);
      
      // Ищем подходящую транзакцию по всем реквизитам устройства
      // Сначала ищем точное совпадение
      let transaction = await db.transaction.findFirst({
        where: {
          bankDetailId: { in: deviceBankDetailIds },
          amount: amount,
          type: TransactionType.IN,
          status: {
            in: [Status.CREATED, Status.IN_PROGRESS]
          },
          traderId: notification.Device.userId
        },
        include: {
          merchant: true,
          bankDetail: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });`;
    
    // Проблема 3: При поиске с погрешностью тоже нужно искать по всем реквизитам
    const oldCode3 = `      // Если не нашли точное совпадение, ищем с небольшой погрешностью (±1 рубль)
      if (!transaction) {
        transaction = await db.transaction.findFirst({
          where: {
            bankDetailId: bankDetails.id,
            amount: {
              gte: amount - 1,
              lte: amount + 1
            },
            type: TransactionType.IN,
            status: {
              in: [Status.CREATED, Status.IN_PROGRESS]
            },
            traderId: bankDetails.userId
          },
          include: {
            merchant: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }`;
    
    const newCode3 = `      // Если не нашли точное совпадение, ищем с небольшой погрешностью (±1 рубль)
      if (!transaction) {
        transaction = await db.transaction.findFirst({
          where: {
            bankDetailId: { in: deviceBankDetailIds },
            amount: {
              gte: amount - 1,
              lte: amount + 1
            },
            type: TransactionType.IN,
            status: {
              in: [Status.CREATED, Status.IN_PROGRESS]
            },
            traderId: notification.Device.userId
          },
          include: {
            merchant: true,
            bankDetail: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }`;
    
    // Проблема 4: В логах нужно показывать правильный банк
    const oldCode4 = `console.log(\`[NotificationMatcherService] Found transaction: \${transactionType} \${amount} RUB from \${bankDetails.bankType}\`);`;
    const newCode4 = `console.log(\`[NotificationMatcherService] Found transaction: \${transactionType} \${amount} RUB\`);`;
    
    const oldCode5 = `console.log(\`[NotificationMatcherService] No matching transaction found for amount \${amount} RUB from \${bankDetails.bankType}\`);`;
    const newCode5 = `console.log(\`[NotificationMatcherService] No matching transaction found for amount \${amount} RUB on device \${notification.Device.id}\`);`;
    
    // Применяем исправления
    if (content.includes(oldCode1)) {
      content = content.replace(oldCode1, newCode1);
      console.log('✓ Исправлена логика определения matcher для банка');
    }
    
    if (content.includes(oldCode2)) {
      content = content.replace(oldCode2, newCode2);
      console.log('✓ Исправлен поиск транзакций по всем реквизитам устройства');
    }
    
    if (content.includes(oldCode3)) {
      content = content.replace(oldCode3, newCode3);
      console.log('✓ Исправлен поиск транзакций с погрешностью');
    }
    
    if (content.includes(oldCode4)) {
      content = content.replace(oldCode4, newCode4);
      console.log('✓ Исправлены логи для вывода информации');
    }
    
    if (content.includes(oldCode5)) {
      content = content.replace(oldCode5, newCode5);
      console.log('✓ Исправлены логи об отсутствии транзакций');
    }
    
    // Добавляем логирование для отладки
    const debugLog = `
      console.log(\`[NotificationMatcherService] Processing notification from device \${notification.Device.id} with \${notification.Device.bankDetails.length} bank details\`);
      console.log(\`[NotificationMatcherService] Bank details on device: \${notification.Device.bankDetails.map((bd: any) => \`\${bd.bankType}:\${bd.id}\`).join(', ')}\`);`;
    
    // Вставляем после проверки bankDetails
    const insertAfter = 'return;\n      }';
    if (content.includes(insertAfter)) {
      content = content.replace(insertAfter, insertAfter + debugLog);
      console.log('✓ Добавлено дополнительное логирование');
    }
    
    await writeFile(filePath, content, 'utf-8');
    console.log('\n✅ NotificationMatcherService успешно исправлен!');
    
    console.log('\nТеперь сервис будет:');
    console.log('1. Проверять все реквизиты на устройстве, а не только первый');
    console.log('2. Искать транзакции по всем реквизитам устройства');
    console.log('3. Правильно сопоставлять банк из уведомления с банком реквизита');
    console.log('4. Выводить более информативные логи');
    
  } catch (error) {
    console.error('Ошибка при исправлении файла:', error);
  }
}

fixNotificationMatcher();