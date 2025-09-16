import { Elysia, t } from 'elysia'
import { db } from '@/db'
import { Prisma, Status, TransactionType } from '@prisma/client'
import ErrorSchema from '@/types/error'

const AuthHeader = t.Object({ 'x-admin-key': t.String() })

const toISO = <T extends { createdAt: Date }>(obj: T) =>
  ({ ...obj, createdAt: obj.createdAt.toISOString() } as any)

export default (app: Elysia) =>
  app
    /* ───────── GET /admin/payment-details ───────── */
    .get(
      '/',
      async ({ query }) => {
        // Build filters
        const where: any = {
          type: TransactionType.OUT,
        }

        // Add filters
        if (query.status) {
          where.status = query.status
        }
        if (query.traderId) {
          where.traderId = query.traderId
        }
        if (query.merchantId) {
          where.merchantId = query.merchantId
        }
        if (query.methodId) {
          where.methodId = query.methodId
        }
        if (query.startDate) {
          where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) }
        }
        if (query.endDate) {
          where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) }
        }
        if (query.amountMin) {
          where.amount = { ...where.amount, gte: query.amountMin }
        }
        if (query.amountMax) {
          where.amount = { ...where.amount, lte: query.amountMax }
        }
        if (query.currency) {
          where.currency = query.currency
        }
        if (query.clientName) {
          where.clientName = { contains: query.clientName, mode: 'insensitive' }
        }
        if (query.requisitesCard) {
          where.requisites = {
            cardNumber: { contains: query.requisitesCard, mode: 'insensitive' }
          }
        }
        if (query.txId) {
          where.OR = [
            { orderId: { contains: query.txId } },
            { numericId: parseInt(query.txId) || -1 }
          ]
        }

        // Pagination
        const page = query.page || 1
        const pageSize = query.pageSize || 50
        const skip = (page - 1) * pageSize

        // Get paginated data with counts
        const [transactions, total] = await Promise.all([
          db.transaction.findMany({
            where,
            include: {
              trader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              },
              merchant: {
                select: {
                  id: true,
                  name: true,
                }
              },
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                }
              },
              requisites: {
                select: {
                  id: true,
                  cardNumber: true,
                  bankType: true,
                  cardholderName: true,
                }
              },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
          }),
          db.transaction.count({ where })
        ])

        // Calculate statistics
        const [totalAmount, successAmount, processingAmount, failedAmount] = await Promise.all([
          db.transaction.aggregate({
            where,
            _sum: { amount: true },
          }),
          db.transaction.aggregate({
            where: { ...where, status: Status.READY },
            _sum: { amount: true },
          }),
          db.transaction.aggregate({
            where: { ...where, status: { in: [Status.AWAITING_TRANSFER, Status.TRANSFER_IN_PROCESS] } },
            _sum: { amount: true },
          }),
          db.transaction.aggregate({
            where: { ...where, status: { in: [Status.CANCELLED, Status.MISTAKE, Status.REFUND] } },
            _sum: { amount: true },
          }),
        ])

        const paymentDetails = transactions.map(tx => ({
          id: tx.id,
          numericId: tx.numericId,
          orderId: tx.orderId,
          amount: tx.amount,
          currency: tx.currency || 'RUB',
          rate: tx.rate,
          status: tx.status,
          clientName: tx.clientName,
          userIp: tx.userIp,
          trader: tx.trader,
          merchant: tx.merchant,
          method: tx.method,
          requisites: tx.requisites,
          bankReceipt: tx.bankReceipt,
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
        }))

        return {
          statistics: {
            total: {
              count: total,
              amount: totalAmount._sum.amount || 0,
            },
            success: {
              count: transactions.filter(tx => tx.status === Status.READY).length,
              amount: successAmount._sum.amount || 0,
            },
            processing: {
              count: transactions.filter(tx => 
                [Status.AWAITING_TRANSFER, Status.TRANSFER_IN_PROCESS].includes(tx.status)
              ).length,
              amount: processingAmount._sum.amount || 0,
            },
            failed: {
              count: transactions.filter(tx => 
                [Status.CANCELLED, Status.MISTAKE, Status.REFUND].includes(tx.status)
              ).length,
              amount: failedAmount._sum.amount || 0,
            },
          },
          paymentDetails,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          }
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить детали платежей (OUT транзакции)' },
        headers: AuthHeader,
        query: t.Object({
          status: t.Optional(t.String()),
          traderId: t.Optional(t.String()),
          merchantId: t.Optional(t.String()),
          methodId: t.Optional(t.String()),
          startDate: t.Optional(t.String()),
          endDate: t.Optional(t.String()),
          amountMin: t.Optional(t.Number()),
          amountMax: t.Optional(t.Number()),
          currency: t.Optional(t.String()),
          clientName: t.Optional(t.String()),
          requisitesCard: t.Optional(t.String()),
          txId: t.Optional(t.String()),
          page: t.Optional(t.Number({ minimum: 1 })),
          pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        }),
        response: {
          200: t.Object({
            statistics: t.Object({
              total: t.Object({
                count: t.Number(),
                amount: t.Number(),
              }),
              success: t.Object({
                count: t.Number(),
                amount: t.Number(),
              }),
              processing: t.Object({
                count: t.Number(),
                amount: t.Number(),
              }),
              failed: t.Object({
                count: t.Number(),
                amount: t.Number(),
              }),
            }),
            paymentDetails: t.Array(t.Object({
              id: t.String(),
              numericId: t.Number(),
              orderId: t.String(),
              amount: t.Number(),
              currency: t.String(),
              rate: t.Nullable(t.Number()),
              status: t.String(),
              clientName: t.String(),
              userIp: t.Nullable(t.String()),
              trader: t.Nullable(t.Object({
                id: t.String(),
                name: t.String(),
                email: t.String(),
              })),
              merchant: t.Nullable(t.Object({
                id: t.String(),
                name: t.String(),
              })),
              method: t.Nullable(t.Object({
                id: t.String(),
                code: t.String(),
                name: t.String(),
                type: t.String(),
                currency: t.String(),
              })),
              requisites: t.Nullable(t.Object({
                id: t.String(),
                cardNumber: t.String(),
                bankType: t.String(),
                cardholderName: t.Nullable(t.String()),
              })),
              bankReceipt: t.Nullable(t.String()),
              createdAt: t.String(),
              updatedAt: t.String(),
            })),
            pagination: t.Object({
              page: t.Number(),
              pageSize: t.Number(),
              total: t.Number(),
              totalPages: t.Number(),
            }),
          }),
        }
      }
    )

    /* ───────── GET /admin/payment-details/export ───────── */
    .get(
      '/export',
      async ({ query }) => {
        // Same filters as above
        const where: any = {
          type: TransactionType.OUT,
        }

        if (query.status) where.status = query.status
        if (query.traderId) where.traderId = query.traderId
        if (query.merchantId) where.merchantId = query.merchantId
        if (query.startDate) where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) }
        if (query.endDate) where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) }

        const transactions = await db.transaction.findMany({
          where,
          include: {
            trader: true,
            merchant: true,
            method: true,
            requisites: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10000, // Limit export to 10k records
        })

        // Create CSV content
        const headers = [
          'ID транзакции',
          'Numeric ID',
          'Дата создания',
          'Статус',
          'Сумма',
          'Валюта',
          'Курс',
          'Клиент',
          'IP',
          'Трейдер',
          'Email трейдера',
          'Мерчант',
          'Метод',
          'Карта',
          'Банк',
          'Держатель карты',
        ].join(',')

        const rows = transactions.map(tx => [
          tx.orderId,
          tx.numericId,
          tx.createdAt.toISOString(),
          tx.status,
          tx.amount,
          tx.currency || 'RUB',
          tx.rate || '',
          tx.clientName,
          tx.userIp || '',
          tx.trader?.name || '',
          tx.trader?.email || '',
          tx.merchant?.name || '',
          tx.method?.name || '',
          tx.requisites?.cardNumber || '',
          tx.requisites?.bankType || '',
          tx.requisites?.cardholderName || '',
        ].map(val => `"${val}"`).join(','))

        const csv = [headers, ...rows].join('\n')

        return new Response(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="payment-details-${new Date().toISOString().split('T')[0]}.csv"`,
          },
        })
      },
      {
        tags: ['admin'],
        detail: { summary: 'Экспорт деталей платежей в CSV' },
        headers: AuthHeader,
        query: t.Object({
          status: t.Optional(t.String()),
          traderId: t.Optional(t.String()),
          merchantId: t.Optional(t.String()),
          startDate: t.Optional(t.String()),
          endDate: t.Optional(t.String()),
        }),
      }
    )