import { Elysia, t } from "elysia";
import { MerchantEmulatorService } from "../../services/merchant-emulator.service";
import { ServiceRegistry } from "../../services/ServiceRegistry";
import { db } from "../../db";

const getEmulatorService = () => {
  try {
    return ServiceRegistry.getInstance().get<MerchantEmulatorService>("MerchantEmulatorService");
  } catch {
    const service = new MerchantEmulatorService();
    ServiceRegistry.register("MerchantEmulatorService", MerchantEmulatorService);
    return service;
  }
};

export const merchantEmulatorApi = new Elysia({ prefix: "/merchant-emulator" })
  // Generate single transaction
  .post(
    "/generate",
    async ({ body, set }) => {
      try {
        const emulator = getEmulatorService();
        await emulator.start();

        const transaction = body.type === "deal"
          ? emulator.generateMockDeal(body)
          : emulator.generateMockWithdrawal(body);

        const result = await emulator.sendMockTransaction(
          body.merchantToken,
          transaction,
          body.merchantRate
        );

        return { success: true, result };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      body: t.Object({
        merchantToken: t.String(),
        type: t.Enum({ deal: "deal", withdrawal: "withdrawal" }),
        amount: t.Optional(t.Number()),
        currency: t.Optional(t.String()),
        cardNumber: t.Optional(t.String()),
        wallet: t.Optional(t.String()),
        bank: t.Optional(t.String()),
        merchantRate: t.Optional(t.Number()),
        webhookUrl: t.Optional(t.String()),
        metadata: t.Optional(t.Any()),
      }),
    }
  )

  // Generate batch
  .post(
    "/batch",
    async ({ body, set }) => {
      try {
        const emulator = getEmulatorService();
        await emulator.start();

        const result = await emulator.generateBatch(body);
        return { success: true, ...result };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      body: t.Object({
        merchantId: t.String(),
        transactionType: t.Enum({ deal: "deal", withdrawal: "withdrawal" }),
        count: t.Number({ minimum: 1, maximum: 1000 }),
        minAmount: t.Optional(t.Number()),
        maxAmount: t.Optional(t.Number()),
        currency: t.Optional(t.String()),
        delayMs: t.Optional(t.Number()),
      }),
    }
  )

  // Get logs
  .get(
    "/logs",
    async ({ query }) => {
      try {
        const emulator = getEmulatorService();
        await emulator.start();

        const filters: any = {
          merchantId: query.merchantId,
          batchId: query.batchId,
          limit: query.limit || 100,
          offset: query.offset || 0,
        };

        if (query.startDate) {
          filters.startDate = new Date(query.startDate);
        }
        if (query.endDate) {
          filters.endDate = new Date(query.endDate);
        }

        const result = await emulator.getLogs(filters);
        return { success: true, ...result };
      } catch (error: any) {
        return { error: error.message };
      }
    },
    {
      query: t.Object({
        merchantId: t.Optional(t.String()),
        batchId: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        limit: t.Optional(t.Number()),
        offset: t.Optional(t.Number()),
      }),
    }
  )

  // Get statistics
  .get(
    "/stats",
    async ({ query }) => {
      try {
        const emulator = getEmulatorService();
        await emulator.start();

        const stats = await emulator.getStatistics(
          query.merchantId,
          query.days || 7
        );

        return { success: true, stats };
      } catch (error: any) {
        return { error: error.message };
      }
    },
    {
      query: t.Object({
        merchantId: t.Optional(t.String()),
        days: t.Optional(t.Number()),
      }),
    }
  )

  // Get merchants list
  .get("/merchants", async () => {
    try {
      const merchants = await db.merchant.findMany({
        where: { disabled: false, banned: false },
        select: {
          id: true,
          name: true,
          token: true,
          createdAt: true,
          _count: {
            select: {
              payouts: true,
              Transaction: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      return {
        success: true,
        merchants: merchants.map((m) => ({
          id: m.id,
          name: m.name,
          token: m.token,
          createdAt: m.createdAt,
          stats: {
            payouts: m._count.payouts,
            deals: m._count.Transaction,
            total: m._count.payouts + m._count.Transaction,
          },
        })),
      };
    } catch (error: any) {
      return { error: error.message };
    }
  });