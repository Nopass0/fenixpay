import { Elysia, t } from 'elysia'
import { db } from '@/db'
import ErrorSchema from '@/types/error'

const authHeader = t.Object({ 'x-admin-key': t.String() })

const AdminBankDetailDTO = t.Object({
  id: t.String(),
  userId: t.String(),
  user: t.Object({
    id: t.String(),
    email: t.String(),
    name: t.String(),
  }),
  methodType: t.String(),
  bankType: t.String(),
  cardNumber: t.String(),
  recipientName: t.String(),
  phoneNumber: t.Optional(t.String()),
  minAmount: t.Number(),
  maxAmount: t.Number(),
  dailyLimit: t.Number(),
  monthlyLimit: t.Number(),
  intervalMinutes: t.Number(),
  isArchived: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
})

export default (app: Elysia) =>
  app
    .get(
      '/list',
      async ({ query }) => {
        const where: any = {}
        if (query.search) {
          where.OR = [
            { cardNumber: { contains: query.search, mode: 'insensitive' } },
            { recipientName: { contains: query.search, mode: 'insensitive' } },
          ]
        }
        if (query.archived && query.archived !== 'all') {
          where.isArchived = query.archived === 'true'
        }
        const res = await db.bankDetail.findMany({
          where,
          include: { user: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        })
        return res.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }))
      },
      {
        tags: ['admin'],
        detail: { summary: 'List all bank details' },
        headers: authHeader,
        query: t.Object({
          search: t.Optional(t.String()),
          archived: t.Optional(t.String()),
        }),
        response: { 200: t.Array(AdminBankDetailDTO), 401: ErrorSchema, 403: ErrorSchema },
      },
    )
    .get(
      '/user/:id',
      async ({ params, query }) => {
        const where: any = { userId: params.id }
        if (query.search) {
          where.OR = [
            { cardNumber: { contains: query.search, mode: 'insensitive' } },
            { recipientName: { contains: query.search, mode: 'insensitive' } },
          ]
        }
        if (query.archived && query.archived !== 'all') {
          where.isArchived = query.archived === 'true'
        }
        const res = await db.bankDetail.findMany({
          where,
          include: { user: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        })
        return res.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }))
      },
      {
        tags: ['admin'],
        detail: { summary: 'List bank details of specific user' },
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        query: t.Object({
          search: t.Optional(t.String()),
          archived: t.Optional(t.String()),
        }),
        response: { 200: t.Array(AdminBankDetailDTO), 401: ErrorSchema, 403: ErrorSchema },
      },
    )
