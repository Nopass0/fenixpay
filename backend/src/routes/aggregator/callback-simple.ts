import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { sendTransactionCallbacks } from "@/utils/notify";
import { Status } from "@prisma/client";

/**
 * API эндпоинт для получения простых колбэков от агрегаторов
 * Формат: { "id": "orderId", "amount": 1234, "status": "READY" }
 */
export default (app: Elysia) =>
  app
    .post(
      "/callback",
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
            'FAILED': 'CANCELED',
            'CANCELLED': 'CANCELED',
            'CANCELED': 'CANCELED',
            'EXPIRED': 'EXPIRED',
            'TIMEOUT': 'EXPIRED'
          };
          
          const mapped = statusMap[incoming] || incoming;
          const newStatus = mapped as Status;
          
          console.log(
            `[AggregatorCallback] Status mapping - incoming: ${incoming}, mapped: ${mapped}`
          );

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
          console.log(
            `[AggregatorCallback] Preparing to send merchant callback for transaction ${transaction.id}`
          );
          console.log(
            `[AggregatorCallback] Callback URLs - callbackUri: ${updatedTransaction.callbackUri}, successUri: ${updatedTransaction.successUri}, failUri: ${updatedTransaction.failUri}`
          );
          
          try {
            const callbackResults = await sendTransactionCallbacks(updatedTransaction);
            console.log(
              `[AggregatorCallback] Merchant callback results:`,
              callbackResults
            );
            if (!callbackResults || callbackResults.length === 0) {
              console.log(
                `[AggregatorCallback] No callbacks were sent (no URLs configured or status doesn't match criteria)`
              );
            } else {
              console.log(
                `[AggregatorCallback] Merchant callback sent successfully for transaction ${transaction.id}`
              );
            }
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
    );
