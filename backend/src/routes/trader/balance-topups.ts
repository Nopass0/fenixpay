import { Elysia, t } from "elysia";
import { db } from "@/db";
import { traderGuard } from "@/middleware/traderGuard";
import ErrorSchema from "@/types/error";
import { BalanceTopUpStatus } from "@prisma/client";

export default (app: Elysia) =>
  app
    .use(traderGuard())
    /** Получить список пополнений баланса */
    .get(
      "",
      async ({ trader }) => {
        const items = await db.balanceTopUp.findMany({
          where: { userId: trader.id },
          orderBy: { createdAt: "desc" },
        });

        return {
          data: items.map((i) => ({
            id: i.id,
            amount: i.amount,
            txHash: i.txHash,
            status: i.status,
            createdAt: i.createdAt.toISOString(),
            processedAt: i.processedAt ? i.processedAt.toISOString() : null,
          })),
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "История пополнений баланса" },
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.String(),
                amount: t.Number(),
                txHash: t.String(),
                status: t.Enum(BalanceTopUpStatus),
                createdAt: t.String(),
                processedAt: t.Union([t.String(), t.Null()]),
              })
            ),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )
    /** Создать запрос на пополнение баланса */
    .post(
      "",
      async ({ trader, body }) => {
        const topup = await db.balanceTopUp.create({
          data: {
            userId: trader.id,
            amount: body.amount,
            txHash: body.txHash,
          },
        });

        return {
          topup: {
            id: topup.id,
            amount: topup.amount,
            txHash: topup.txHash,
            status: topup.status,
            createdAt: topup.createdAt.toISOString(),
          },
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Создать запрос на пополнение баланса" },
        body: t.Object({ amount: t.Number(), txHash: t.String() }),
        response: {
          200: t.Object({
            topup: t.Object({
              id: t.String(),
              amount: t.Number(),
              txHash: t.String(),
              status: t.Enum(BalanceTopUpStatus),
              createdAt: t.String(),
            }),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    );
