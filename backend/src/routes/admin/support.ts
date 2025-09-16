import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { SupportTicketStatus, SupportTicketPriority, UserType } from "@prisma/client";

export default (app: Elysia) =>
  app
    /* ───────────────── Get all tickets ───────────────── */
    .get(
      "/",
      async ({ query }) => {
        const where: any = {};
        
        if (query.status) {
          where.status = query.status;
        }
        
        if (query.priority) {
          where.priority = query.priority;
        }
        
        if (query.userType) {
          where.userType = query.userType;
        }
        
        if (query.search) {
          where.OR = [
            { subject: { contains: query.search, mode: 'insensitive' } },
            { messages: { some: { message: { contains: query.search, mode: 'insensitive' } } } },
          ];
        }
        
        const tickets = await db.supportTicket.findMany({
          where,
          include: {
            user: true,
            agent: true,
            merchant: true,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            _count: {
              select: { messages: true },
            },
          },
          orderBy: query.sortBy === 'priority' 
            ? [{ priority: 'desc' }, { updatedAt: 'desc' }]
            : { updatedAt: 'desc' },
          take: query.limit || 50,
          skip: query.offset || 0,
        });
        
        return tickets.map(ticket => ({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          userType: ticket.userType,
          user: ticket.user ? {
            id: ticket.user.id,
            email: ticket.user.email,
            name: ticket.user.name,
          } : null,
          agent: ticket.agent ? {
            id: ticket.agent.id,
            email: ticket.agent.email,
            name: ticket.agent.name,
          } : null,
          merchant: ticket.merchant ? {
            id: ticket.merchant.id,
            name: ticket.merchant.name,
          } : null,
          lastMessage: ticket.messages[0] || null,
          messageCount: ticket._count.messages,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          closedAt: ticket.closedAt?.toISOString() || null,
        }));
      },
      {
        tags: ["admin"],
        detail: { summary: "Получение всех тикетов" },
        query: t.Object({
          status: t.Optional(t.Enum(SupportTicketStatus)),
          priority: t.Optional(t.Enum(SupportTicketPriority)),
          userType: t.Optional(t.Enum(UserType)),
          search: t.Optional(t.String()),
          sortBy: t.Optional(t.String()),
          limit: t.Optional(t.Number()),
          offset: t.Optional(t.Number()),
        }),
        response: {
          200: t.Array(t.Object({
            id: t.String(),
            subject: t.String(),
            status: t.String(),
            priority: t.String(),
            userType: t.String(),
            user: t.Nullable(t.Object({
              id: t.String(),
              email: t.String(),
              name: t.String(),
            })),
            agent: t.Nullable(t.Object({
              id: t.String(),
              email: t.String(),
              name: t.String(),
            })),
            merchant: t.Nullable(t.Object({
              id: t.String(),
              name: t.String(),
            })),
            lastMessage: t.Any(),
            messageCount: t.Number(),
            createdAt: t.String(),
            updatedAt: t.String(),
            closedAt: t.Nullable(t.String()),
          })),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Get ticket details ───────────────── */
    .get(
      "/:ticketId",
      async ({ params, error }) => {
        const ticket = await db.supportTicket.findUnique({
          where: { id: params.ticketId },
          include: {
            user: {
              include: {
                bankDetails: { where: { isArchived: false } },
                traderMerchants: { include: { merchant: true } },
                agentTraders: { include: { agent: true } },
              },
            },
            agent: {
              include: {
                teams: true,
                agentTraders: { include: { trader: true } },
              },
            },
            merchant: {
              include: {
                merchantMethods: { include: { method: true } },
              },
            },
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        
        if (!ticket) {
          return error(404, { error: "Тикет не найден" });
        }
        
        return {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          userType: ticket.userType,
          userDetails: ticket.user || ticket.agent || ticket.merchant,
          messages: ticket.messages.map(msg => ({
            id: msg.id,
            message: msg.message,
            isFromSupport: msg.isFromSupport,
            authorName: msg.authorName,
            attachments: msg.attachments,
            createdAt: msg.createdAt.toISOString(),
            readAt: msg.readAt?.toISOString() || null,
          })),
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          closedAt: ticket.closedAt?.toISOString() || null,
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Получение деталей тикета" },
        params: t.Object({
          ticketId: t.String(),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            subject: t.String(),
            status: t.String(),
            priority: t.String(),
            userType: t.String(),
            userDetails: t.Any(),
            messages: t.Array(t.Object({
              id: t.String(),
              message: t.String(),
              isFromSupport: t.Boolean(),
              authorName: t.Nullable(t.String()),
              attachments: t.Array(t.String()),
              createdAt: t.String(),
              readAt: t.Nullable(t.String()),
            })),
            createdAt: t.String(),
            updatedAt: t.String(),
            closedAt: t.Nullable(t.String()),
          }),
          401: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Send message as support ───────────────── */
    .post(
      "/:ticketId/messages",
      async ({ params, body, error }) => {
        const ticket = await db.supportTicket.findUnique({
          where: { id: params.ticketId },
        });
        
        if (!ticket) {
          return error(404, { error: "Тикет не найден" });
        }
        
        const message = await db.supportMessage.create({
          data: {
            ticketId: ticket.id,
            message: body.message,
            isFromSupport: true,
            authorName: body.authorName || 'Техподдержка',
            attachments: body.attachments || [],
          },
        });
        
        // Update ticket status
        await db.supportTicket.update({
          where: { id: ticket.id },
          data: {
            status: body.updateStatus || 'IN_PROGRESS',
            updatedAt: new Date(),
          },
        });
        
        return {
          id: message.id,
          message: message.message,
          isFromSupport: message.isFromSupport,
          authorName: message.authorName,
          attachments: message.attachments,
          createdAt: message.createdAt.toISOString(),
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Отправка сообщения от поддержки" },
        params: t.Object({
          ticketId: t.String(),
        }),
        body: t.Object({
          message: t.String(),
          authorName: t.Optional(t.String()),
          attachments: t.Optional(t.Array(t.String())),
          updateStatus: t.Optional(t.Enum(SupportTicketStatus)),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            message: t.String(),
            isFromSupport: t.Boolean(),
            authorName: t.Nullable(t.String()),
            attachments: t.Array(t.String()),
            createdAt: t.String(),
          }),
          401: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Update ticket status ───────────────── */
    .patch(
      "/:ticketId/status",
      async ({ params, body, error }) => {
        const ticket = await db.supportTicket.findUnique({
          where: { id: params.ticketId },
        });
        
        if (!ticket) {
          return error(404, { error: "Тикет не найден" });
        }
        
        const updatedTicket = await db.supportTicket.update({
          where: { id: params.ticketId },
          data: {
            status: body.status,
            priority: body.priority,
            closedAt: body.status === 'CLOSED' ? new Date() : null,
          },
        });
        
        return {
          id: updatedTicket.id,
          status: updatedTicket.status,
          priority: updatedTicket.priority,
          closedAt: updatedTicket.closedAt?.toISOString() || null,
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Обновление статуса тикета" },
        params: t.Object({
          ticketId: t.String(),
        }),
        body: t.Object({
          status: t.Optional(t.Enum(SupportTicketStatus)),
          priority: t.Optional(t.Enum(SupportTicketPriority)),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            status: t.String(),
            priority: t.String(),
            closedAt: t.Nullable(t.String()),
          }),
          401: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Get support statistics ───────────────── */
    .get(
      "/stats",
      async () => {
        const [
          openCount,
          inProgressCount,
          waitingReplyCount,
          resolvedCount,
          todayCount,
          avgResponseTime,
        ] = await Promise.all([
          db.supportTicket.count({ where: { status: 'OPEN' } }),
          db.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
          db.supportTicket.count({ where: { status: 'WAITING_REPLY' } }),
          db.supportTicket.count({ where: { status: 'RESOLVED' } }),
          db.supportTicket.count({
            where: {
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
          }),
          // Calculate average response time (mock for now)
          Promise.resolve(1.5),
        ]);
        
        return {
          openCount,
          inProgressCount,
          waitingReplyCount,
          resolvedCount,
          todayCount,
          avgResponseTime,
          totalActive: openCount + inProgressCount + waitingReplyCount,
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Получение статистики поддержки" },
        response: {
          200: t.Object({
            openCount: t.Number(),
            inProgressCount: t.Number(),
            waitingReplyCount: t.Number(),
            resolvedCount: t.Number(),
            todayCount: t.Number(),
            avgResponseTime: t.Number(),
            totalActive: t.Number(),
          }),
          401: ErrorSchema,
        },
      },
    );