import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { aggregatorApiGuard } from "@/middleware/aggregatorGuard";
import { sendTransactionCallbacks } from "@/utils/notify";
import { Status } from "@prisma/client";

/**
 * API эндпоинт для получения колбэков от агрегаторов
 * Используется агрегаторами для уведомления об изменениях статуса транзакций
 */
export default (app: Elysia) =>
  app
    /* ──────── POST /aggregator/callback - Простой формат { id, amount, status } ──────── */
    .group("/callback", (app) =>
      app.post(
        "",
        async ({ body, headers, error }) => {
        const startTime = Date.now();
        
        try {
          console.log(
            `[AggregatorCallback] Received simple callback:`,
            body
          );

          // Проверяем формат колбэка
          if (!body.id || !body.status) {
            return error(400, { 
              error: "Неверный формат колбэка. Ожидается { id, amount, status }" 
            });
          }

          // Ищем транзакцию по orderId (id в колбэке)
          const transaction = await db.transaction.findFirst({
            where: {
              orderId: body.id,
            },
            include: {
              merchant: true,
              method: true,
              aggregator: true,
            },
          });

          if (!transaction) {
            console.error(
              `[AggregatorCallback] Transaction not found for orderId:`,
              body.id
            );
            return error(404, { error: "Транзакция не найдена" });
          }

          // Проверяем, что транзакция принадлежит агрегатору
          if (!transaction.aggregatorId) {
            console.error(
              `[AggregatorCallback] Transaction ${transaction.id} is not an aggregator transaction`
            );
            return error(400, { error: "Транзакция не является агрегаторской" });
          }

          // Маппим статус
          const incoming = (body.status || "").toString().toUpperCase();
          const statusMap: Record<string, string> = {
            'CREATED': 'IN_PROGRESS',
            'PROGRESS': 'PROCESSING',
            'PROCESSING': 'PROCESSING',
            'SUCCESS': 'READY',
            'COMPLETED': 'READY',
            'READY': 'READY',
            'FAILED': 'CANCELLED',
            'CANCELLED': 'CANCELLED',
            'EXPIRED': 'EXPIRED',
            'TIMEOUT': 'EXPIRED'
          };
          
          const mapped = statusMap[incoming] || incoming;
          const newStatus = mapped as Status;

          // Обновляем статус транзакции
          const updatedTransaction = await db.transaction.update({
            where: { id: transaction.id },
            data: {
              status: newStatus,
              ...(newStatus === Status.READY && { acceptedAt: new Date() }),
              ...(body.amount && { amount: body.amount }),
            },
            include: {
              merchant: true,
              method: true,
              aggregator: true,
            },
          });

          // Обработка финансовых операций при завершении
          if (newStatus === Status.READY && transaction.status !== Status.READY) {
            await db.$transaction(async (prisma) => {
              if (transaction.type === "IN") {
                const rate = transaction.rate || 100;
                const merchantCredit = transaction.amount / rate;

                // Начисляем мерчанту
                await prisma.merchant.update({
                  where: { id: transaction.merchantId },
                  data: {
                    balanceUsdt: { increment: merchantCredit },
                  },
                });

                // Списываем с агрегатора
                await prisma.aggregator.update({
                  where: { id: transaction.aggregatorId },
                  data: {
                    balanceUsdt: { decrement: merchantCredit },
                  },
                });
              }
            });
          }

          // Отправляем колбэк мерчанту
          try {
            await sendTransactionCallbacks(updatedTransaction);
            console.log(
              `[AggregatorCallback] Merchant callback sent for transaction ${transaction.id}`
            );
          } catch (callbackError) {
            console.error(
              `[AggregatorCallback] Error sending merchant callback:`,
              callbackError
            );
          }

          return {
            success: true,
            message: "Колбэк обработан успешно",
          };
        } catch (e) {
          console.error(`[AggregatorCallback] Error processing simple callback:`, e);
          return error(500, { error: "Ошибка обработки колбэка" });
        } finally {
          // Логируем колбэк
          const responseTime = Date.now() - startTime;
          
          try {
            // Находим транзакцию для логирования
            const transactionForLog = await db.transaction.findFirst({
              where: { orderId: body.id },
              select: { aggregatorId: true }
            });
            
            await db.aggregatorIntegrationLog.create({
              data: {
                aggregatorId: transactionForLog?.aggregatorId || 'unknown',
                direction: 'IN' as any,
                eventType: 'callback_simple',
                method: 'POST',
                url: '/api/aggregator/callback',
                headers: {
                  'content-type': headers['content-type'] || 'application/json'
                },
                requestBody: body as any,
                responseBody: { success: true } as any,
                statusCode: 200,
                responseTimeMs: responseTime,
                ourDealId: body.id,
                error: null
              }
            });
          } catch (logError) {
            console.error('[AggregatorCallback] Failed to log simple callback:', logError);
          }
        }
      },
      {
        tags: ["aggregator-api"],
        detail: { summary: "Простой колбэк от агрегатора" },
        body: t.Object({
          id: t.String({ description: "ID заказа (orderId)" }),
          amount: t.Optional(t.Number({ description: "Сумма транзакции" })),
          status: t.String({ description: "Статус транзакции" }),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
      }
    )
    /* ──────── POST /aggregator/callback - Старый формат ──────── */
    .use(aggregatorApiGuard()).post(
      "/old",
        async ({ aggregator, body, headers, error }) => {
          const { type, transactionId, data } = body;
          const startTime = Date.now();

          try {
            console.log(
              `[AggregatorCallback] Received callback from ${aggregator.name}:`,
              {
                type,
                transactionId,
                data,
              }
            );

            // Проверяем, что транзакция принадлежит этому агрегатору
            const transaction = await db.transaction.findFirst({
              where: {
                id: transactionId,
                aggregatorId: aggregator.id,
              },
              include: {
                merchant: true,
                method: true,
              },
            });

            if (!transaction) {
              console.error(
                `[AggregatorCallback] Transaction not found or doesn't belong to aggregator:`,
                {
                  transactionId,
                  aggregatorId: aggregator.id,
                }
              );
              return error(404, { error: "Транзакция не найдена" });
            }

            if (type === "transaction_status_update") {
              // Маппим CREATED в IN_PROGRESS согласно бизнес-правилу
              const incoming = (data.status || "").toString().toUpperCase();
              const mapped = incoming === "CREATED" ? "IN_PROGRESS" : incoming;
              const newStatus = mapped as Status;

              // Проверяем валидность статуса
              const validStatuses = [
                "CREATED",
                "IN_PROGRESS",
                "READY",
                "CANCELED",
                "EXPIRED",
                "DISPUTE",
              ];
              if (!validStatuses.includes(newStatus)) {
                return error(400, { error: "Недопустимый статус" });
              }

              // Обновляем статус транзакции
              const updatedTransaction = await db.transaction.update({
                where: { id: transactionId },
                data: {
                  status: newStatus,
                  updatedAt: new Date(),
                  ...(newStatus === "READY" && { acceptedAt: new Date() }),
                },
                include: {
                  merchant: true,
                  method: true,
                },
              });

              // Обновляем метрики агрегатора
              const { aggregatorMetricsService } = await import('@/services/aggregator-metrics.service');
              await aggregatorMetricsService.updateMetricsOnStatusChange(
                transactionId,
                transaction.status as any,
                newStatus
              );

              console.log(`[AggregatorCallback] Transaction status updated:`, {
                transactionId,
                oldStatus: transaction.status,
                newStatus,
                aggregatorName: aggregator.name,
              });

              // Обрабатываем финансовые операции
              if (newStatus === "READY" && transaction.status !== "READY") {
                await db.$transaction(async (prisma) => {
                  // Начисляем мерчанту (упрощенная логика)
                  if (transaction.type === "IN") {
                    // Для агрегаторских транзакций используем фиксированный курс
                    const rate = transaction.rate || 100; // fallback rate
                    const merchantCredit = transaction.amount / rate;

                    await prisma.merchant.update({
                      where: { id: transaction.merchantId },
                      data: {
                        balanceUsdt: { increment: merchantCredit },
                      },
                    });

                    // Списываем с баланса агрегатора
                    await prisma.aggregator.update({
                      where: { id: aggregator.id },
                      data: {
                        balanceUsdt: { decrement: merchantCredit },
                      },
                    });
                  }
                });
              }

              // Отправляем колбэк мерчанту
              try {
                await sendTransactionCallbacks(updatedTransaction);
                console.log(
                  `[AggregatorCallback] Merchant callback sent for transaction ${transactionId}`
                );
              } catch (callbackError) {
                console.error(
                  `[AggregatorCallback] Error sending merchant callback:`,
                  callbackError
                );
              }

              return {
                success: true,
                message: "Статус транзакции обновлен",
              };
            }

            if (type === "dispute_created") {
              // Создаем спор
              const dispute = await db.aggregatorDispute.create({
                data: {
                  transactionId,
                  aggregatorId: aggregator.id,
                  merchantId: transaction.merchantId,
                  subject: data.subject || "Спор по транзакции",
                  description: data.description,
                  status: "OPEN",
                },
              });

              console.log(`[AggregatorCallback] Dispute created:`, {
                disputeId: dispute.id,
                transactionId,
                aggregatorName: aggregator.name,
              });

              // Обновляем статус транзакции на DISPUTE
              await db.transaction.update({
                where: { id: transactionId },
                data: {
                  status: "DISPUTE",
                  updatedAt: new Date(),
                },
              });

              return {
                success: true,
                message: "Спор создан",
                disputeId: dispute.id,
              };
            }

            return error(400, { error: "Неизвестный тип колбэка" });
          } catch (e) {
            console.error(`[AggregatorCallback] Error processing callback:`, e);
            return error(500, { error: "Ошибка обработки колбэка" });
          } finally {
            // Log callback to API logs
            const responseTime = Date.now() - startTime;
            
            try {
              await db.aggregatorIntegrationLog.create({
                data: {
                  aggregatorId: aggregator.id,
                  direction: 'IN' as any,
                  eventType: `callback_${type}`,
                  method: 'POST',
                  url: '/api/aggregator/callback',
                  headers: {
                    'x-aggregator-api-token': '[PRESENT]',
                    'content-type': headers['content-type'] || 'application/json'
                  },
                  requestBody: body as any,
                  responseBody: { success: true } as any,
                  statusCode: 200,
                  responseTimeMs: responseTime,
                  ourDealId: transactionId,
                  error: null
                }
              });
            } catch (logError) {
              console.error('[AggregatorCallback] Failed to log callback:', logError);
            }
          }
        },
        {
          tags: ["aggregator-api"],
          detail: { summary: "Колбэк от агрегатора" },
          body: t.Object({
            type: t.Union([
              t.Literal("transaction_status_update"),
              t.Literal("dispute_created"),
            ]),
            transactionId: t.String(),
            data: t.Object({
              status: t.Optional(t.String()),
              subject: t.Optional(t.String()),
              description: t.Optional(t.String()),
              timestamp: t.Optional(t.String()),
            }),
          }),
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
              disputeId: t.Optional(t.String()),
            }),
            400: ErrorSchema,
            404: ErrorSchema,
            500: ErrorSchema,
          },
        }
      )
    );
