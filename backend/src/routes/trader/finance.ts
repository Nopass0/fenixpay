import Elysia, { t } from "elysia";
import { db } from "../../db";
import { traderGuard } from "@/middleware/traderGuard";
import type { RequestContext } from "../../types/request";

export const financeRoutes = new Elysia({ prefix: "/finance" })
  .use(traderGuard())
  
  // Get finance operations (deposits, withdrawals, etc.)
  .get(
    "/operations",
    async ({ trader, query }: RequestContext) => {
      const page = Number(query?.page) || 1;
      const limit = Number(query?.limit) || 20;
      const skip = (page - 1) * limit;
      const filter = query?.filter || 'all';

      // Build where clause based on filter
      const whereClause: any = { traderId: trader.id };
      
      if (filter !== 'all') {
        switch (filter) {
          case 'deposits':
            whereClause.OR = [
              { depositRequests: { some: {} } }
            ];
            break;
          case 'withdrawals':
            whereClause.OR = [
              { withdrawalRequests: { some: {} } }
            ];
            break;
        }
      }

      // Get deposit requests
      const depositRequests = await db.depositRequest.findMany({
        where: { traderId: trader.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      // Get withdrawal requests
      const withdrawalRequests = await db.withdrawalRequest.findMany({
        where: { traderId: trader.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      // Get completed transactions that affect balance
      const transactions = await db.transaction.findMany({
        where: {
          traderId: trader.id,
          status: 'READY'
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          commission: true,
          status: true,
          type: true,
          createdAt: true,
          orderId: true,
          numericId: true
        }
      });

      // Get payouts that affect balance
      const payouts = await db.payout.findMany({
        where: {
          traderId: trader.id,
          status: { in: ['COMPLETED', 'CANCELLED'] }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          amountUsdt: true,
          status: true,
          direction: true,
          createdAt: true,
          numericId: true
        }
      });

      // Combine and format all operations
      const operations = [];

      // Add deposits
      for (const deposit of depositRequests) {
        operations.push({
          id: deposit.id,
          type: 'deposit',
          amount: deposit.amountUSDT,
          currency: 'USDT',
          status: deposit.status.toLowerCase(),
          date: deposit.createdAt.toISOString(),
          description: 'Пополнение баланса',
          txHash: deposit.txHash,
          network: 'TRC-20'
        });
      }

      // Add withdrawals
      for (const withdrawal of withdrawalRequests) {
        operations.push({
          id: withdrawal.id,
          type: 'withdrawal',
          amount: withdrawal.amountUSDT,
          currency: 'USDT',
          status: withdrawal.status.toLowerCase(),
          date: withdrawal.createdAt.toISOString(),
          description: `Вывод ${withdrawal.balanceType}`,
          txHash: withdrawal.txHash,
          network: withdrawal.network
        });
      }

      // Add transaction profits
      for (const tx of transactions) {
        if (tx.type === 'IN') {
          operations.push({
            id: tx.id,
            type: 'profit',
            amount: tx.commission || 0,
            currency: 'RUB',
            status: 'completed',
            date: tx.createdAt.toISOString(),
            description: `Комиссия со сделки #${tx.numericId}`,
            dealId: tx.numericId
          });
        }
      }

      // Add payout profits
      for (const payout of payouts) {
        if (payout.direction === 'OUT' && payout.status === 'COMPLETED') {
          operations.push({
            id: payout.id,
            type: 'profit',
            amount: payout.amount * 0.02, // Assuming 2% commission
            currency: 'RUB',
            status: 'completed',
            date: payout.createdAt.toISOString(),
            description: `Комиссия с выплаты #${payout.numericId}`,
            dealId: payout.numericId
          });
        }
      }

      // Sort all operations by date
      operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Paginate
      const paginatedOperations = operations.slice(skip, skip + limit);

      return {
        operations: paginatedOperations,
        pagination: {
          page,
          limit,
          total: operations.length,
          pages: Math.ceil(operations.length / limit)
        }
      };
    },
    {
      detail: {
        tags: ["trader", "finance"],
        summary: "Get finance operations"
      },
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        filter: t.Optional(t.String())
      })
    }
  )

  // Get deposit requests
  .get(
    "/deposit-requests",
    async ({ trader, query }: RequestContext) => {
      const page = Number(query?.page) || 1;
      const limit = Number(query?.limit) || 10;
      const skip = (page - 1) * limit;

      const [requests, total] = await Promise.all([
        db.depositRequest.findMany({
          where: { traderId: trader.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        db.depositRequest.count({
          where: { traderId: trader.id }
        })
      ]);

      return {
        requests: requests.map(req => ({
          id: req.id,
          amount: req.amountUSDT,
          currency: 'USDT',
          status: req.status.toLowerCase(),
          date: req.createdAt.toISOString(),
          network: 'TRC-20',
          txHash: req.txHash,
          confirmations: req.confirmations
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    },
    {
      detail: {
        tags: ["trader", "finance"],
        summary: "Get deposit requests"
      },
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String())
      })
    }
  )

  // Get withdrawal requests
  .get(
    "/withdrawal-requests",
    async ({ trader, query }: RequestContext) => {
      const page = Number(query?.page) || 1;
      const limit = Number(query?.limit) || 10;
      const skip = (page - 1) * limit;

      const [requests, total] = await Promise.all([
        db.withdrawalRequest.findMany({
          where: { traderId: trader.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        db.withdrawalRequest.count({
          where: { traderId: trader.id }
        })
      ]);

      return {
        requests: requests.map(req => ({
          id: req.id,
          amount: req.amountUSDT,
          currency: 'USDT',
          status: req.status.toLowerCase(),
          date: req.createdAt.toISOString(),
          network: req.network,
          walletAddress: req.walletAddress,
          balanceType: req.balanceType,
          txHash: req.txHash,
          rejectionReason: req.rejectionReason
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    },
    {
      detail: {
        tags: ["trader", "finance"],
        summary: "Get withdrawal requests"
      },
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String())
      })
    }
  );