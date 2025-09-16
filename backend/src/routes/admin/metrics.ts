import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Status, TransactionType } from "@prisma/client";

export default (app: Elysia) =>
  app
    .get(
      "/metrics",
      async ({ query }) => {
        console.log("[Metrics API] Request received with query:", query);
        
        try {
          // Парсим даты если они есть
          const startDate = query.startDate ? new Date(query.startDate) : undefined;
          const endDate = query.endDate ? new Date(query.endDate) : undefined;
          
          console.log("[Metrics API] Date range:", { startDate, endDate });

          // Строим фильтр по датам
          const dateFilter = {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate })
          };
          
          const hasDateFilter = startDate || endDate;

          // 1. Общий оборот полученных рублей от мерчанта (все транзакции IN)
          const totalRubFromMerchantsResult = await db.transaction.aggregate({
            where: {
              type: TransactionType.IN,
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { amount: true }
          });
          const totalRubFromMerchants = totalRubFromMerchantsResult._sum.amount || 0;

          // 2. Общий оборот в рублях полученных трейдерами (успешные транзакции IN)
          const totalRubReceivedByTradersResult = await db.transaction.aggregate({
            where: {
              type: TransactionType.IN,
              status: Status.READY,
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { amount: true }
          });
          const totalRubReceivedByTraders = totalRubReceivedByTradersResult._sum.amount || 0;

          // 3. Молочные сделки по причине мерчанта (транзакции которые истекли без трейдера)
          const totalRubMilkByMerchantResult = await db.transaction.aggregate({
            where: {
              type: TransactionType.IN,
              status: Status.EXPIRED,
              traderId: null,
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { amount: true }
          });
          const totalRubMilkByMerchant = totalRubMilkByMerchantResult._sum.amount || 0;

          // 4. Отмененные, истекшие и в спорах
          const canceledDealsResult = await db.transaction.aggregate({
            where: {
              status: Status.CANCELED,
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { amount: true }
          });
          const canceledDealsAmount = canceledDealsResult._sum.amount || 0;

          const expiredDealsResult = await db.transaction.aggregate({
            where: {
              status: Status.EXPIRED,
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { amount: true }
          });
          const expiredDealsAmount = expiredDealsResult._sum.amount || 0;

          const disputeDealsResult = await db.transaction.aggregate({
            where: {
              status: Status.DISPUTE,
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { amount: true }
          });
          const disputeDealsAmount = disputeDealsResult._sum.amount || 0;

          // 5. Сделки со статусом MILK по причине мерчанта
          const milkByMerchantResult = await db.transaction.aggregate({
            where: {
              status: Status.MILK,
              error: { contains: "merchant" },
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { amount: true }
          });
          const milkByMerchantAmount = milkByMerchantResult._sum.amount || 0;

          // 6. Сделки в молоко по неопределенной причине
          const milkUndefinedResult = await db.transaction.aggregate({
            where: {
              status: Status.MILK,
              OR: [
                { error: { not: { contains: "merchant" } } },
                { error: null }
              ],
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { amount: true }
          });
          const milkUndefinedAmount = milkUndefinedResult._sum.amount || 0;

          // 7. Все молочные сделки
          const totalMilkResult = await db.transaction.aggregate({
            where: {
              status: Status.MILK,
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { amount: true }
          });
          const totalMilkAmount = totalMilkResult._sum.amount || 0;

          // 8. Сделки в статусе IN_PROGRESS (ожидают зачисления)
          const pendingPaymentResult = await db.transaction.aggregate({
            where: {
              status: Status.IN_PROGRESS,
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { amount: true }
          });
          const pendingPaymentAmount = pendingPaymentResult._sum.amount || 0;

          // 11. Общая сумма отправленных USDT мерчантам
          // Считаем на основе успешных транзакций IN (мерчанты получают USDT за успешные сделки)
          const successfulInTransactions = await db.transaction.findMany({
            where: {
              type: TransactionType.IN,
              status: Status.READY,
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            select: {
              amount: true,
              rate: true,
              commission: true
            }
          });

          let totalUsdtSentToMerchants = 0;
          for (const transaction of successfulInTransactions) {
            if (transaction.rate && transaction.rate > 0) {
              // Мерчант получает сумму за вычетом комиссии
              const amountAfterCommission = transaction.amount * (1 - (transaction.commission || 0) / 100);
              totalUsdtSentToMerchants += amountAfterCommission / transaction.rate;
            }
          }

          console.log("[Metrics API] Successful IN transactions:", successfulInTransactions.length, "Total USDT sent to merchants:", totalUsdtSentToMerchants);

          // 12. Общая сумма полученных USDT от трейдеров (через frozenUsdtAmount)
          const totalUsdtReceivedFromTradersResult = await db.transaction.aggregate({
            where: {
              type: TransactionType.IN,
              status: Status.READY,
              frozenUsdtAmount: { not: null },
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { frozenUsdtAmount: true }
          });
          const totalUsdtReceivedFromTraders = totalUsdtReceivedFromTradersResult._sum.frozenUsdtAmount || 0;

          // Получаем данные об агентских комиссиях
          const agentPayoutsResult = await db.agentPayout.aggregate({
            where: {
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _sum: { earnings: true }
          });
          const totalAgentEarnings = agentPayoutsResult._sum.earnings || 0;

          // 9. Прибыль без вычета агентских
          const platformProfitBeforeAgents = totalUsdtReceivedFromTraders - totalUsdtSentToMerchants;

          // 10. Прибыль с вычетом агентских
          const platformProfitAfterAgents = platformProfitBeforeAgents - totalAgentEarnings;

          // 13. Средневзвешенный спред
          const averageWeightedSpread = totalUsdtSentToMerchants > 0
            ? ((platformProfitAfterAgents * 100) / totalUsdtSentToMerchants) - 100
            : 0;

          // Подсчет успешных сделок для средних значений
          const successfulDealsCount = await db.transaction.count({
            where: {
              type: TransactionType.IN,
              status: Status.READY,
              ...(hasDateFilter && { createdAt: dateFilter })
            }
          });

          // 15. Средний заработок без вычета агентских
          const averageEarningsPerDealBeforeAgents = successfulDealsCount > 0
            ? platformProfitBeforeAgents / successfulDealsCount
            : 0;

          // 16. Средний заработок с вычетом агентских
          const averageEarningsPerDealAfterAgents = successfulDealsCount > 0
            ? platformProfitAfterAgents / successfulDealsCount
            : 0;

          // 17. Средняя сумма заявки
          const averageOrderAmount = successfulDealsCount > 0
            ? totalRubReceivedByTraders / successfulDealsCount
            : 0;

          // 18. Статистика по ордерам
          const totalOrdersCount = await db.transaction.count({
            where: {
              ...(hasDateFilter && { createdAt: dateFilter })
            }
          });

          const acceptedCount = await db.transaction.count({
            where: {
              traderId: { not: null },
              ...(hasDateFilter && { createdAt: dateFilter })
            }
          });

          const notAcceptedCount = await db.transaction.count({
            where: {
              traderId: null,
              status: Status.EXPIRED,
              ...(hasDateFilter && { createdAt: dateFilter })
            }
          });

          const failedDueToMerchantConversion = await db.transaction.count({
            where: {
              status: Status.MILK,
              error: { contains: "merchant" },
              ...(hasDateFilter && { createdAt: dateFilter })
            }
          });

          // Статистика по статусам
          const statusCounts = await db.transaction.groupBy({
            by: ['status'],
            where: {
              ...(hasDateFilter && { createdAt: dateFilter })
            },
            _count: { status: true }
          });

          const byStatus: Record<string, number> = {};
          statusCounts.forEach(item => {
            byStatus[item.status] = item._count.status;
          });

          console.log("[Metrics API] Metrics calculated successfully");

          return {
            success: true,
            data: {
              totalRubFromMerchants,
              totalRubReceivedByTraders,
              totalRubMilkByMerchant,
              canceledDealsAmount,
              expiredDealsAmount,
              canceledAndExpiredTotal: canceledDealsAmount + expiredDealsAmount,
              disputeDealsAmount,
              milkByMerchantAmount,
              milkUndefinedAmount,
              totalMilkAmount,
              pendingPaymentAmount,
              platformProfitBeforeAgents,
              platformProfitAfterAgents,
              totalUsdtSentToMerchants,
              totalUsdtReceivedFromTraders,
              averageWeightedSpread,
              earningsPerDeal: [], // Это слишком тяжелый запрос, оставим пустым
              averageEarningsPerDealBeforeAgents,
              averageEarningsPerDealAfterAgents,
              averageOrderAmount,
              orderStats: {
                total: totalOrdersCount,
                accepted: acceptedCount,
                notAccepted: notAcceptedCount,
                failedDueToMerchantConversion,
                byStatus,
              },
            },
          };
        } catch (error) {
          console.error("[Metrics API] Error calculating metrics:", error);
          return {
            success: false,
            error: error.message || "Failed to calculate metrics"
          };
        }
      },
      {
        query: t.Object({
          startDate: t.Optional(t.String()),
          endDate: t.Optional(t.String()),
        }),
        detail: {
          summary: "Get platform metrics",
          description: "Calculate and return all platform metrics with optional date filtering",
          tags: ["Admin", "Metrics"],
        },
      }
    );