import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Status, TransactionType } from "@prisma/client";
import ErrorSchema from "@/types/error";

export default (app: Elysia) =>
  app.get(
    "/",
    async ({ query }) => {
      const from = query.from ? new Date(query.from) : new Date(0);
      const to = query.to ? new Date(query.to) : new Date();

      const transactions = await db.transaction.findMany({
        where: {
          type: TransactionType.IN,
          status: Status.READY,
          acceptedAt: { gte: from, lte: to },
        },
        include: { trader: true },
      });

      const total = transactions.reduce((acc, t) => {
        const stake = t.trader?.stakePercent ?? 0;
        const comm = t.trader?.profitPercent ?? 0;
        const rubAfter = t.amount * (1 - comm / 100);
        const rateAdj = t.rate ? t.rate * (1 - stake / 100) : undefined;
        const need =
          !rateAdj || t.currency?.toLowerCase() === "usdt"
            ? rubAfter
            : rubAfter / rateAdj;
        return acc + need;
      }, 0);

      const settled = await db.merchantSettlement.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: from, lte: to } },
      });

      return { profit: total - (settled._sum.amount ?? 0) };
    },
    {
      tags: ["admin"],
      detail: { summary: "Профит платформы за период" },
      headers: t.Object({ "x-admin-key": t.String() }),
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
      response: { 200: t.Object({ profit: t.Number() }), 401: ErrorSchema, 403: ErrorSchema },
    },
  );
