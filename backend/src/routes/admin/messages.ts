import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { MessageType, MessagePriority } from "@prisma/client";

export default (app: Elysia) =>
  app
    
    /* ─────────── POST /admin/messages/test-sms ─────────── */
    .post(
      '/test-sms',
      async ({ body, error }) => {
        try {
          // Проверяем существование трейдера
          const trader = await db.user.findUnique({
            where: { id: body.traderId },
            select: { id: true }
          });

          if (!trader) {
            return error(404, { error: 'Трейдер не найден' });
          }

          // Генерируем тестовое SMS сообщение
          const banks = ['Сбербанк', 'Тинькофф', 'Альфа-Банк', 'ВТБ', 'Райффайзен'];
          const randomBank = banks[Math.floor(Math.random() * banks.length)];
          
          const smsTemplates = [
            {
              subject: `SMS от ${randomBank}`,
              content: `Перевод ${body.amount || Math.floor(Math.random() * 50000) + 1000}р от ${body.senderName || 'ИВАН И.'}. Баланс: ${Math.floor(Math.random() * 100000) + 10000}р`
            },
            {
              subject: `${randomBank} Онлайн`,
              content: `Поступление ${body.amount || Math.floor(Math.random() * 50000) + 1000} RUB. Отправитель: ${body.senderName || 'Петров П.П.'}. Доступно: ${Math.floor(Math.random() * 100000) + 10000} RUB`
            },
            {
              subject: `900`,
              content: `${randomBank}: Зачисление ${body.amount || Math.floor(Math.random() * 50000) + 1000}р. от ${body.senderName || 'Сидоров С.С.'}. Карта *${Math.floor(Math.random() * 9000) + 1000}`
            }
          ];

          const template = smsTemplates[Math.floor(Math.random() * smsTemplates.length)];

          // Check if device exists and belongs to trader
          let deviceId = body.deviceId;
          if (!deviceId) {
            // Find any device belonging to the trader
            const device = await db.device.findFirst({
              where: { userId: body.traderId },
              select: { id: true }
            });
            
            if (!device) {
              return error(404, { error: 'У трейдера нет устройств' });
            }
            deviceId = device.id;
          }

          // Создаем notification (SMS) для устройства
          const notification = await db.notification.create({
            data: {
              type: 'SMS',
              application: template.subject,
              title: template.subject,
              message: template.content,
              deviceId: deviceId,
              isProcessed: false,
              metadata: {
                phoneNumber: template.subject,
                sender: randomBank,
                isTestMessage: true,
                bank: randomBank,
                amount: body.amount || Math.floor(Math.random() * 50000) + 1000,
                transactionId: body.transactionId
              }
            }
          });

          // Also create a message for the trader's message center
          const message = await db.message.create({
            data: {
              traderId: body.traderId,
              subject: template.subject,
              content: template.content,
              type: MessageType.TRANSACTION,
              priority: MessagePriority.HIGH,
              metadata: {
                deviceId: deviceId,
                notificationId: notification.id,
                isTestMessage: true,
                bank: randomBank,
                amount: body.amount || Math.floor(Math.random() * 50000) + 1000
              },
              relatedEntityId: body.transactionId,
              relatedEntity: body.transactionId ? 'transaction' : null
            }
          });

          return {
            success: true,
            message: {
              id: message.id,
              subject: message.subject,
              content: message.content,
              createdAt: message.createdAt
            }
          };
        } catch (e: any) {
          console.error('Failed to create test SMS:', e);
          return error(500, { error: 'Ошибка создания тестового SMS', details: e.message });
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Создать тестовое SMS сообщение для трейдера' },
        headers: t.Object({ 'x-admin-key': t.String() }),
        body: t.Object({
          traderId: t.String({ description: 'ID трейдера' }),
          amount: t.Optional(t.Number({ description: 'Сумма перевода' })),
          senderName: t.Optional(t.String({ description: 'Имя отправителя' })),
          deviceId: t.Optional(t.String({ description: 'ID устройства' })),
          transactionId: t.Optional(t.String({ description: 'ID связанной транзакции' }))
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.Object({
              id: t.String(),
              subject: t.String(),
              content: t.String(),
              createdAt: t.Date()
            })
          }),
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/messages/bulk-test-sms ─────────── */
    .post(
      '/bulk-test-sms',
      async ({ body, error }) => {
        try {
          const count = body.count || 5;
          const messages = [];

          for (let i = 0; i < count; i++) {
            // Случайный трейдер
            const traders = await db.user.findMany({
              select: { id: true },
              take: 10
            });

            if (traders.length === 0) {
              return error(404, { error: 'Нет доступных трейдеров' });
            }

            const randomTrader = traders[Math.floor(Math.random() * traders.length)];
            
            // Генерируем сообщение
            const banks = ['Сбербанк', 'Тинькофф', 'Альфа-Банк', 'ВТБ', 'Райффайзен'];
            const randomBank = banks[Math.floor(Math.random() * banks.length)];
            const amount = Math.floor(Math.random() * 50000) + 1000;
            
            const smsTemplates = [
              {
                subject: `SMS от ${randomBank}`,
                content: `Перевод ${amount}р от ИВАН И. Баланс: ${Math.floor(Math.random() * 100000) + 10000}р`
              },
              {
                subject: `${randomBank} Онлайн`,
                content: `Поступление ${amount} RUB. Отправитель: Петров П.П. Доступно: ${Math.floor(Math.random() * 100000) + 10000} RUB`
              },
              {
                subject: `900`,
                content: `${randomBank}: Зачисление ${amount}р. от Сидоров С.С. Карта *${Math.floor(Math.random() * 9000) + 1000}`
              }
            ];

            const template = smsTemplates[Math.floor(Math.random() * smsTemplates.length)];

            // Find a device for this trader
            const device = await db.device.findFirst({
              where: { userId: randomTrader.id },
              select: { id: true }
            });

            if (!device) {
              continue; // Skip if trader has no devices
            }

            // Create notification for device
            const notification = await db.notification.create({
              data: {
                type: 'SMS',
                application: template.subject,
                title: template.subject,
                message: template.content,
                deviceId: device.id,
                isProcessed: false,
                metadata: {
                  phoneNumber: template.subject,
                  sender: randomBank,
                  isTestMessage: true,
                  bank: randomBank,
                  amount: amount
                }
              }
            });

            // Also create a message
            const message = await db.message.create({
              data: {
                traderId: randomTrader.id,
                subject: template.subject,
                content: template.content,
                type: MessageType.TRANSACTION,
                priority: MessagePriority.NORMAL,
                metadata: {
                  deviceId: device.id,
                  notificationId: notification.id,
                  isTestMessage: true,
                  bank: randomBank,
                  amount: amount
                }
              }
            });

            messages.push({
              id: message.id,
              traderId: message.traderId,
              subject: message.subject,
              content: message.content
            });

            // Небольшая задержка между созданием сообщений
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          return {
            success: true,
            count: messages.length,
            messages
          };
        } catch (e: any) {
          console.error('Failed to create bulk test SMS:', e);
          return error(500, { error: 'Ошибка создания тестовых SMS', details: e.message });
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Создать несколько тестовых SMS сообщений' },
        headers: t.Object({ 'x-admin-key': t.String() }),
        body: t.Object({
          count: t.Optional(t.Number({ description: 'Количество сообщений (по умолчанию 5)', minimum: 1, maximum: 50 }))
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            count: t.Number(),
            messages: t.Array(t.Object({
              id: t.String(),
              traderId: t.String(),
              subject: t.String(),
              content: t.String()
            }))
          }),
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/messages/create-notification ─────────── */
    .post(
      '/create-notification',
      async ({ body, error }) => {
        try {
          // Проверяем существование устройства
          const device = await db.device.findUnique({
            where: { id: body.deviceId },
            include: { 
              user: { select: { id: true, email: true } },
              bankDetails: { select: { bankType: true } }
            }
          });

          if (!device) {
            return error(404, { error: 'Устройство не найдено' });
          }

          // Создаем уведомление
          const notification = await db.notification.create({
            data: {
              type: body.type || 'AppNotification',
              application: body.application,
              title: body.title,
              message: body.message,
              deviceId: body.deviceId,
              isProcessed: false,
              metadata: {
                ...body.metadata,
                isTestNotification: true,
                createdBy: 'admin-panel'
              }
            }
          });

          return {
            success: true,
            notification: {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              deviceId: notification.deviceId,
              createdAt: notification.createdAt
            },
            device: {
              name: device.name,
              userEmail: device.user.email
            }
          };
        } catch (e: any) {
          console.error('Failed to create test notification:', e);
          return error(500, { error: 'Ошибка создания тестового уведомления', details: e.message });
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Создать тестовое уведомление для устройства' },
        headers: t.Object({ 'x-admin-key': t.String() }),
        body: t.Object({
          deviceId: t.String({ description: 'ID устройства' }),
          type: t.Optional(t.String({ description: 'Тип уведомления', default: 'AppNotification' })),
          application: t.String({ description: 'Название приложения/пакет' }),
          title: t.String({ description: 'Заголовок уведомления' }),
          message: t.String({ description: 'Текст уведомления' }),
          metadata: t.Optional(t.Record(t.String(), t.Any(), { description: 'Дополнительные данные' }))
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            notification: t.Object({
              id: t.String(),
              type: t.String(),
              title: t.String(),
              message: t.String(),
              deviceId: t.String(),
              createdAt: t.Date()
            }),
            device: t.Object({
              name: t.String(),
              userEmail: t.String()
            })
          }),
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    );