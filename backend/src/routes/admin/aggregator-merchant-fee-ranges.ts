import { Elysia, t } from "elysia";
import { db } from "@/db";

export default (app: Elysia) =>
  app
    // CORS middleware для всех админских роутов
    .onBeforeHandle(({ request, set }) => {
      const origin = request.headers.get("origin");
      
      // Разрешаем все origin для разработки
      set.headers["Access-Control-Allow-Origin"] = origin || "*";
      set.headers["Access-Control-Allow-Credentials"] = "true";
      set.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD";
      set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, authorization, x-trader-token, x-admin-key, x-device-token, x-agent-token, x-merchant-api-key, x-api-key, x-api-token, x-aggregator-session-token, x-aggregator-token, x-2fa-verified";
      set.headers["Access-Control-Expose-Headers"] = "x-trader-token, x-admin-key, x-device-token, x-agent-token, x-merchant-api-key, x-api-key, x-api-token, x-aggregator-session-token, x-aggregator-token";
      set.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      set.headers["Pragma"] = "no-cache";
      set.headers["Expires"] = "0";
    })
    // Handle OPTIONS requests
    .options("/*", ({ set, request }) => {
      const origin = request.headers.get("origin");
      
      set.headers["Access-Control-Allow-Origin"] = origin || "*";
      set.headers["Access-Control-Allow-Credentials"] = "true";
      set.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD";
      set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, authorization, x-trader-token, x-admin-key, x-device-token, x-agent-token, x-merchant-api-key, x-api-key, x-api-token, x-aggregator-session-token, x-aggregator-token, x-2fa-verified";
      set.headers["Access-Control-Max-Age"] = "86400";
      set.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      set.headers["Pragma"] = "no-cache";
      set.headers["Expires"] = "0";
      
      set.status = 204;
      return "";
    })
    // Получить промежутки ставок для агрегатора-мерчанта
    .get(
      "/aggregator-merchant/:id/fee-ranges",
      async ({ params: { id }, error }) => {
        try {
          const aggregatorMerchant = await db.aggregatorMerchant.findUnique({
            where: { id },
            include: {
              aggregator: {
                select: { id: true, name: true }
              },
              merchant: {
                select: { id: true, name: true }
              },
              method: {
                select: { id: true, name: true, code: true }
              },
              feeRanges: {
                where: { isActive: true },
                orderBy: { minAmount: "asc" }
              }
            }
          });

          if (!aggregatorMerchant) {
            return error(404, { error: "Aggregator merchant not found" });
          }

          return {
            success: true,
            data: {
              id: aggregatorMerchant.id,
              useFlexibleRates: aggregatorMerchant.useFlexibleRates,
              aggregator: aggregatorMerchant.aggregator,
              merchant: aggregatorMerchant.merchant,
              method: aggregatorMerchant.method,
              defaultFeeIn: aggregatorMerchant.feeIn,
              defaultFeeOut: aggregatorMerchant.feeOut,
              feeRanges: aggregatorMerchant.feeRanges
            }
          };
        } catch (err: any) {
          console.error("Error fetching aggregator merchant fee ranges:", err);
          return error(500, { error: "Internal server error" });
        }
      }
    )

    // Добавить новый промежуток ставки
    .post(
      "/aggregator-merchant/:id/fee-ranges",
      async ({ params: { id }, body, error }) => {
        try {
          const { minAmount, maxAmount, feeInPercent, feeOutPercent } = body as {
            minAmount: number;
            maxAmount: number;
            feeInPercent: number;
            feeOutPercent: number;
          };

          // Проверяем, что агрегатор-мерчант существует
          const aggregatorMerchant = await db.aggregatorMerchant.findUnique({
            where: { id }
          });

          if (!aggregatorMerchant) {
            return error(404, { error: "Aggregator merchant not found" });
          }

          // Проверяем, что промежуток не пересекается с существующими
          const overlappingRange = await db.aggregatorMerchantFeeRange.findFirst({
            where: {
              aggregatorMerchantId: id,
              isActive: true,
              OR: [
                {
                  AND: [
                    { minAmount: { lte: minAmount } },
                    { maxAmount: { gte: minAmount } }
                  ]
                },
                {
                  AND: [
                    { minAmount: { lte: maxAmount } },
                    { maxAmount: { gte: maxAmount } }
                  ]
                },
                {
                  AND: [
                    { minAmount: { gte: minAmount } },
                    { maxAmount: { lte: maxAmount } }
                  ]
                }
              ]
            }
          });

          if (overlappingRange) {
            return error(400, { 
              error: "Промежуток пересекается с существующим диапазоном" 
            });
          }

          // Создаем новый промежуток
          const feeRange = await db.aggregatorMerchantFeeRange.create({
            data: {
              aggregatorMerchantId: id,
              minAmount,
              maxAmount,
              feeInPercent,
              feeOutPercent,
              isActive: true
            }
          });

          return {
            success: true,
            data: feeRange
          };
        } catch (err: any) {
          console.error("Error creating aggregator merchant fee range:", err);
          return error(500, { error: "Internal server error" });
        }
      },
      {
        body: t.Object({
          minAmount: t.Number(),
          maxAmount: t.Number(),
          feeInPercent: t.Number(),
          feeOutPercent: t.Number()
        })
      }
    )

    // Удалить промежуток ставки
    .delete(
      "/aggregator-merchant/:aggregatorMerchantId/fee-ranges/:rangeId",
      async ({ params: { aggregatorMerchantId, rangeId }, error }) => {
        try {
          // Проверяем, что промежуток принадлежит данному агрегатору-мерчанту
          const feeRange = await db.aggregatorMerchantFeeRange.findFirst({
            where: {
              id: rangeId,
              aggregatorMerchantId
            }
          });

          if (!feeRange) {
            return error(404, { error: "Fee range not found" });
          }

          // Мягкое удаление - деактивируем
          await db.aggregatorMerchantFeeRange.update({
            where: { id: rangeId },
            data: { isActive: false }
          });

          return {
            success: true,
            message: "Fee range deleted successfully"
          };
        } catch (err: any) {
          console.error("Error deleting aggregator merchant fee range:", err);
          return error(500, { error: "Internal server error" });
        }
      }
    )

    // Обновить настройки агрегатора-мерчанта
    .patch(
      "/aggregator-merchant/:id",
      async ({ params: { id }, body, error }) => {
        try {
          const updates = body as {
            useFlexibleRates?: boolean;
            feeIn?: number;
            feeOut?: number;
            isTrafficEnabled?: boolean;
          };

          const aggregatorMerchant = await db.aggregatorMerchant.update({
            where: { id },
            data: updates
          });

          return {
            success: true,
            data: aggregatorMerchant
          };
        } catch (err: any) {
          console.error("Error updating aggregator merchant:", err);
          return error(500, { error: "Internal server error" });
        }
      },
      {
        body: t.Object({
          useFlexibleRates: t.Optional(t.Boolean()),
          feeIn: t.Optional(t.Number()),
          feeOut: t.Optional(t.Number()),
          isTrafficEnabled: t.Optional(t.Boolean())
        })
      }
    );
