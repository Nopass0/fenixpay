import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { BalanceTopUpStatus } from "@prisma/client";

const authHeader = t.Object({ "x-admin-key": t.String() });

export default (app: Elysia) =>
  app
    /** Список всех запросов на пополнение */
    .get(
      "/list",
      async () => {
        const items = await db.balanceTopUp.findMany({
          include: { user: true },
          orderBy: { createdAt: "desc" },
        });
        return items.map((i) => ({
          id: i.id,
          amount: i.amount,
          txHash: i.txHash,
          status: i.status,
          createdAt: i.createdAt.toISOString(),
          processedAt: i.processedAt ? i.processedAt.toISOString() : null,
          user: {
            id: i.user.id,
            email: i.user.email,
            name: i.user.name,
          },
        }));
      },
      {
        tags: ["admin"],
        headers: authHeader,
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              amount: t.Number(),
              txHash: t.String(),
              status: t.Enum(BalanceTopUpStatus),
              createdAt: t.String(),
              processedAt: t.Union([t.String(), t.Null()]),
              user: t.Object({
                id: t.String(),
                email: t.String(),
                name: t.String(),
              }),
            })
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )
    /** Подтвердить пополнение */
    .post(
      "/:id/approve",
      async ({ params, error }) => {
        const topup = await db.balanceTopUp.findUnique({
          where: { id: params.id },
        });
        if (!topup) return error(404, { error: "Not found" });
        if (topup.status !== BalanceTopUpStatus.PENDING)
          return error(400, { error: "Already processed" });

        await db.$transaction([
          db.balanceTopUp.update({
            where: { id: topup.id },
            data: { status: BalanceTopUpStatus.APPROVED, processedAt: new Date() },
          }),
          db.user.update({
            where: { id: topup.userId },
            data: { balanceUsdt: { increment: topup.amount } },
          }),
        ]);
        return { ok: true };
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema,
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )
    /** Отклонить пополнение */
    .post(
      "/:id/reject",
      async ({ params, error }) => {
        const topup = await db.balanceTopUp.findUnique({
          where: { id: params.id },
        });
        if (!topup) return error(404, { error: "Not found" });
        if (topup.status !== BalanceTopUpStatus.PENDING)
          return error(400, { error: "Already processed" });

        await db.balanceTopUp.update({
          where: { id: topup.id },
          data: { status: BalanceTopUpStatus.REJECTED, processedAt: new Date() },
        });
        return { ok: true };
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema,
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    );
