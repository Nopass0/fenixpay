import { Elysia, t } from "elysia";
import { db } from "@/db";
import { merchantGuard } from "@/middleware/merchantGuard";
import ErrorSchema from "@/types/error";

/**
 * Маршруты для работы с трейдерами (только чтение)
 * Все эндпоинты защищены проверкой API ключа мерчанта
 */
export default (app: Elysia) =>
  app
    .use(merchantGuard())
    
    /* ──────── GET /merchant/traders/stats ──────── */
    .get(
      "/stats",
      async () => {
        try {
          // Получаем активных трейдеров
          const traders = await db.trader.findMany({
            where: {
              banned: false,
              user: {
                verified: true,
                role: "TRADER"
              }
            },
            include: {
              user: true
            }
          });

          // Подсчитываем статистику
          const stats = {
            available: traders.length,
            totalBalance: traders.reduce((sum, trader) => sum + (trader.trustBalance || 0), 0),
            totalDeposit: traders.reduce((sum, trader) => sum + (trader.deposit || 0), 0),
            totalFrozenUsdt: traders.reduce((sum, trader) => sum + (trader.frozenUsdt || 0), 0),
            totalFrozenRub: traders.reduce((sum, trader) => sum + (trader.frozenRub || 0), 0),
          };

          return {
            success: true,
            data: stats
          };
        } catch (error) {
          console.error("Failed to get trader stats:", error);
          throw error;
        }
      },
      {
        detail: {
          tags: ["merchant", "traders"],
          summary: "Получение статистики по трейдерам"
        },
        response: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Object({
              available: t.Number(),
              totalBalance: t.Number(),
              totalDeposit: t.Number(),
              totalFrozenUsdt: t.Number(),
              totalFrozenRub: t.Number(),
            })
          }),
          401: ErrorSchema,
        },
      },
    );