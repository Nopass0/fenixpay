import { Elysia, t } from 'elysia'
import { db } from '@/db'
import { Prisma } from '@prisma/client'
import ErrorSchema from '@/types/error'

const AuthHeader = t.Object({ 'x-admin-key': t.String() })

const toISO = <T extends { createdAt: Date }>(obj: T) =>
  ({ ...obj, createdAt: obj.createdAt.toISOString() } as any)

export default (app: Elysia) =>
  app
    /* ───────── GET /admin/devices ───────── */
    .get(
      '/',
      async ({ query }) => {
        // Build filters
        const where: any = {}

        // Add filters
        if (query.traderId) {
          where.userId = query.traderId
        }
        if (query.isOnline !== undefined) {
          where.isOnline = query.isOnline === 'true'
        }
        if (query.name) {
          where.name = { contains: query.name, mode: 'insensitive' }
        }
        if (query.emulated !== undefined) {
          where.emulated = query.emulated === 'true'
        }
        if (query.startDate) {
          where.lastActiveAt = { ...where.lastActiveAt, gte: new Date(query.startDate) }
        }
        if (query.endDate) {
          where.lastActiveAt = { ...where.lastActiveAt, lte: new Date(query.endDate) }
        }

        // Pagination
        const page = query.page || 1
        const pageSize = query.pageSize || 50
        const skip = (page - 1) * pageSize

        // Get paginated data with counts
        const [devices, total] = await Promise.all([
          db.device.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              },
              bankDetails: {
                select: {
                  id: true,
                  bankType: true,
                  cardNumber: true,
                  methodType: true,
                }
              },
            },
            orderBy: { lastActiveAt: 'desc' },
            skip,
            take: pageSize,
          }),
          db.device.count({ where })
        ])

        // Get statistics
        const [totalDevices, onlineDevices] = await Promise.all([
          db.device.count(),
          db.device.count({ where: { isOnline: true } }),
        ])

        const deviceData = devices.map(device => ({
          id: device.id,
          name: device.name,
          isOnline: device.isOnline || false,
          energy: device.energy,
          ethernetSpeed: device.ethernetSpeed,
          emulated: device.emulated,
          trader: device.user,
          bankDetails: device.bankDetails || [],
          lastActiveAt: device.lastActiveAt?.toISOString() || null,
          createdAt: device.createdAt.toISOString(),
        }))

        return {
          statistics: {
            total: totalDevices,
            online: onlineDevices,
            offline: totalDevices - onlineDevices,
          },
          devices: deviceData,
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
        detail: { summary: 'Получить список устройств' },
        headers: AuthHeader,
        query: t.Object({
          traderId: t.Optional(t.String()),
          isOnline: t.Optional(t.String()),
          name: t.Optional(t.String()),
          emulated: t.Optional(t.String()),
          startDate: t.Optional(t.String()),
          endDate: t.Optional(t.String()),
          page: t.Optional(t.Number({ minimum: 1 })),
          pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        }),
        response: {
          200: t.Object({
            statistics: t.Object({
              total: t.Number(),
              online: t.Number(),
              offline: t.Number(),
            }),
            devices: t.Array(t.Object({
              id: t.String(),
              name: t.String(),
              isOnline: t.Boolean(),
              energy: t.Union([t.Number(), t.Null()]),
              ethernetSpeed: t.Union([t.Number(), t.Null()]),
              emulated: t.Boolean(),
              trader: t.Object({
                id: t.String(),
                name: t.String(),
                email: t.String(),
              }),
              lastActiveAt: t.Union([t.String(), t.Null()]),
              createdAt: t.String(),
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

    /* ───────── PUT /admin/devices/:id ───────── */
    .put(
      '/:id',
      async ({ params: { id }, body, error }) => {
        try {
          const device = await db.device.update({
            where: { id },
            data: { isActive: body.isActive },
            include: {
              trader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              },
            },
          })
          
          return {
            id: device.id,
            deviceId: device.deviceId,
            model: device.model,
            manufacturer: device.manufacturer,
            fingerprint: device.fingerprint,
            appVersion: device.appVersion,
            isActive: device.isActive,
            trader: device.trader,
            lastActiveAt: device.lastActiveAt.toISOString(),
            createdAt: device.createdAt.toISOString(),
          }
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Устройство не найдено' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Обновить статус устройства' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({ isActive: t.Boolean() }),
        response: {
          200: t.Object({
            id: t.String(),
            deviceId: t.String(),
            model: t.String(),
            manufacturer: t.String(),
            fingerprint: t.String(),
            appVersion: t.String(),
            isActive: t.Boolean(),
            trader: t.Object({
              id: t.String(),
              name: t.String(),
              email: t.String(),
            }),
            lastActiveAt: t.String(),
            createdAt: t.String(),
          }),
          404: ErrorSchema
        }
      }
    )

    /* ───────── GET /admin/devices/:id ───────── */
    .get(
      '/:id',
      async ({ params: { id }, error }) => {
        const device = await db.device.findUnique({
          where: { id },
          include: {
            trader: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            bankDetails: {
              include: {
                _count: {
                  select: { transactions: true }
                }
              }
            }
          }
        })

        if (!device) {
          return error(404, { error: 'Device not found' })
        }

        return {
          ...device,
          createdAt: device.createdAt.toISOString(),
          lastActivity: device.lastActiveAt?.toISOString() || device.createdAt.toISOString(),
          bankDetails: device.bankDetails.map(bd => ({
            ...bd,
            transactionCount: bd._count.transactions,
            createdAt: bd.createdAt.toISOString(),
            updatedAt: bd.updatedAt.toISOString()
          }))
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить детали устройства' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        response: {
          404: ErrorSchema
        }
      }
    )
    
    /* ───────── GET /admin/devices/:id/messages ───────── */
    .get(
      '/:id/messages',
      async ({ params: { id } }) => {
        const messages = await db.notification.findMany({
          where: { deviceId: id },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })

        return messages.map(m => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString()
        }))
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить сообщения устройства' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
      }
    )
    
    /* ───────── GET /admin/devices/:id/transactions ───────── */
    .get(
      '/:id/transactions',
      async ({ params: { id } }) => {
        const transactions = await db.transaction.findMany({
          where: { 
            bankDetail: {
              deviceId: id
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })

        return transactions.map(t => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          expired_at: t.expired_at.toISOString(),
          acceptedAt: t.acceptedAt?.toISOString() || null
        }))
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить транзакции устройства' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
      }
    )
    
    /* ───────── PATCH /admin/devices/:id/connection ───────── */
    .patch(
      '/:id/connection',
      async ({ params: { id }, body }) => {
        await db.device.update({
          where: { id },
          data: { isConnected: body.isConnected }
        })

        return { success: true }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Изменить статус подключения устройства' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          isConnected: t.Boolean(),
        }),
      }
    )
    
    /* ───────── PATCH /admin/devices/:id/trust ───────── */
    .patch(
      '/:id/trust',
      async ({ params: { id }, body }) => {
        await db.device.update({
          where: { id },
          data: { isTrusted: body.isTrusted }
        })

        return { success: true }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Изменить статус доверия устройству' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          isTrusted: t.Boolean(),
        }),
      }
    )

    /* ───────── DELETE /admin/devices/:id ───────── */
    .delete(
      '/:id',
      async ({ params: { id }, error }) => {
        try {
          await db.device.delete({ where: { id } })
          return { ok: true }
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          )
            return error(404, { error: 'Устройство не найдено' })
          throw e
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Удалить устройство' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema
        }
      }
    )