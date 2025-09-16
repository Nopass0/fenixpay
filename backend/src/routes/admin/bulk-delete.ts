import { Elysia, t } from "elysia";
import { db } from "@/db";

export default new Elysia()
  
  /* ───────────────── Get deletion statistics ───────────────── */
  .get("/stats", async () => {
    const [
      totalTransactions,
      totalPayouts,
      totalDeals,
      merchants,
      transactionStatuses,
      payoutStatuses,
      dealStatuses,
      transactionsByMerchant
    ] = await Promise.all([
      db.transaction.count(),
      db.payout.count(),
      db.dealDispute.count(),
      db.merchant.findMany({ select: { id: true, name: true } }),
      db.transaction.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      db.payout.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      db.dealDispute.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      db.transaction.groupBy({
        by: ['merchantId'],
        _count: { merchantId: true }
      })
    ]);

    return {
      totals: {
        transactions: totalTransactions,
        payouts: totalPayouts,
        deals: totalDeals
      },
      merchants: merchants.map(m => {
        const count = transactionsByMerchant.find(tm => tm.merchantId === m.id)?._count.merchantId || 0;
        return { id: m.id, name: m.name, transactionCount: count };
      }),
      statuses: {
        transactions: transactionStatuses.map(s => ({
          status: s.status,
          count: s._count.status
        })),
        payouts: payoutStatuses.map(s => ({
          status: s.status,
          count: s._count.status
        })),
        deals: dealStatuses.map(s => ({
          status: s.status,
          count: s._count.status
        }))
      }
    };
  })
  
  /* ───────────────── Delete transactions ───────────────── */
  .delete("/transactions", async ({ body }) => {
    const { status, merchantId, deleteAll } = body;
    
    let whereClause: any = {};
    
    if (!deleteAll) {
      if (status) whereClause.status = status;
      if (merchantId) whereClause.merchantId = merchantId;
    }
    
    const count = await db.transaction.count({ where: whereClause });
    
    if (count === 0) {
      return { deleted: 0, message: "Нет транзакций для удаления" };
    }
    
    // Delete related records first
    const transactionIds = await db.transaction.findMany({
      where: whereClause,
      select: { id: true }
    }).then(txs => txs.map(tx => tx.id));
    
    // Note: Notifications don't have direct relation to transactions
    
    // Note: TransactionCallback model doesn't exist in current schema
    
    // Delete deal disputes related to transactions
    await db.dealDispute.deleteMany({
      where: { dealId: { in: transactionIds } }
    });
    
    // Delete the transactions
    const result = await db.transaction.deleteMany({ where: whereClause });
    
    return { 
      deleted: result.count, 
      message: `Удалено ${result.count} транзакций` 
    };
  }, {
    body: t.Object({
      status: t.Optional(t.String()),
      merchantId: t.Optional(t.String()),
      deleteAll: t.Boolean({ default: false })
    })
  })
  
  /* ───────────────── Delete payouts ───────────────── */
  .delete("/payouts", async ({ body }) => {
    const { status, deleteAll } = body;
    
    let whereClause: any = {};
    
    if (!deleteAll) {
      if (status) whereClause.status = status;
    }
    
    const count = await db.payout.count({ where: whereClause });
    
    if (count === 0) {
      return { deleted: 0, message: "Нет выплат для удаления" };
    }
    
    // Delete related records
    const payoutIds = await db.payout.findMany({
      where: whereClause,
      select: { id: true }
    }).then(payouts => payouts.map(p => p.id));
    
    // Delete withdrawal disputes related to payouts
    await db.withdrawalDispute.deleteMany({
      where: { payoutId: { in: payoutIds } }
    });
    
    // Delete the payouts
    const result = await db.payout.deleteMany({ where: whereClause });
    
    return { 
      deleted: result.count, 
      message: `Удалено ${result.count} выплат` 
    };
  }, {
    body: t.Object({
      status: t.Optional(t.String()),
      deleteAll: t.Boolean({ default: false })
    })
  })
  
  /* ───────────────── Delete deals (disputes) ───────────────── */
  .delete("/deals", async ({ body }) => {
    const { status, deleteAll } = body;
    
    let whereClause: any = {};
    
    if (!deleteAll) {
      if (status) whereClause.status = status;
    }
    
    const count = await db.dealDispute.count({ where: whereClause });
    
    if (count === 0) {
      return { deleted: 0, message: "Нет сделок для удаления" };
    }
    
    // Delete dispute messages first
    const disputeIds = await db.dealDispute.findMany({
      where: whereClause,
      select: { id: true }
    }).then(disputes => disputes.map(d => d.id));
    
    await db.dealDisputeMessage.deleteMany({
      where: { disputeId: { in: disputeIds } }
    });
    
    // Delete the deal disputes
    const result = await db.dealDispute.deleteMany({ where: whereClause });
    
    return { 
      deleted: result.count, 
      message: `Удалено ${result.count} сделок` 
    };
  }, {
    body: t.Object({
      status: t.Optional(t.String()),
      deleteAll: t.Boolean({ default: false })
    })
  })
  
  /* ───────────────── Delete everything ───────────────── */
  .delete("/all", async () => {
    // Delete in correct order to respect foreign key constraints
    const deletedCounts = {
      dealDisputeMessages: await db.dealDisputeMessage.deleteMany(),
      withdrawalDisputeMessages: await db.withdrawalDisputeMessage.deleteMany(),
      dealDisputes: await db.dealDispute.deleteMany(),
      withdrawalDisputes: await db.withdrawalDispute.deleteMany(),
      transactions: await db.transaction.deleteMany(),
      payouts: await db.payout.deleteMany()
    };
    
    return {
      deleted: {
        transactions: deletedCounts.transactions.count,
        payouts: deletedCounts.payouts.count,
        dealDisputes: deletedCounts.dealDisputes.count,
        withdrawalDisputes: deletedCounts.withdrawalDisputes.count,
        dealDisputeMessages: deletedCounts.dealDisputeMessages.count,
        withdrawalDisputeMessages: deletedCounts.withdrawalDisputeMessages.count
      },
      message: "Все данные удалены"
    };
  });