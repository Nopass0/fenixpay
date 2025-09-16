import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { UserType, SupportTicketStatus, SupportTicketPriority } from "@prisma/client";

// Create a generic guard that accepts different auth headers
const supportAuthGuard = new Elysia({ name: 'supportAuth' })
  .derive(async ({ request, error }) => {
    console.log('=== SUPPORT AUTH GUARD ===');
    console.log('Request URL:', request.url);
    console.log('Request Method:', request.method);
    console.log('All headers:', Object.fromEntries(request.headers.entries()));
    
    const traderToken = request.headers.get("x-trader-token");
    const agentToken = request.headers.get("x-agent-token");
    const merchantToken = request.headers.get("authorization");
    
    console.log('Support auth guard - headers:', {
      traderToken: traderToken ? `present (${traderToken.length} chars)` : 'missing',
      agentToken: agentToken ? `present (${agentToken.length} chars)` : 'missing',
      merchantToken: merchantToken ? `present (${merchantToken.length} chars)` : 'missing'
    });
    
    // Check for non-empty tokens
    if (traderToken && traderToken.trim() !== '') {
      const session = await db.session.findUnique({
        where: { token: traderToken },
        include: { user: true },
      });
      
      if (!session || session.expiredAt < new Date()) {
        console.log('Invalid trader session');
        throw error(401, { error: "Invalid or expired trader token" });
      }
      
      console.log('Trader authenticated:', session.user.email);
      
      return {
        userType: 'TRADER' as UserType,
        userId: session.userId,
        userName: session.user.name || session.user.email,
        userInfo: session.user,
        agentId: null,
        merchantId: null,
      };
    }
    
    if (agentToken && agentToken.trim() !== '') {
      const session = await db.agentSession.findUnique({
        where: { token: agentToken },
        include: { agent: true },
      });
      
      if (!session || session.expiredAt < new Date()) {
        throw error(401, { error: "Invalid or expired agent token" });
      }
      
      return {
        userType: 'AGENT' as UserType,
        agentId: session.agentId,
        userName: session.agent.name,
        userInfo: session.agent,
        userId: null,
        merchantId: null,
      };
    }
    
    if (merchantToken && merchantToken.trim() !== '' && merchantToken !== 'Bearer ') {
      const token = merchantToken.replace("Bearer ", "");
      
      // Get session from database
      const sessionConfig = await db.systemConfig.findUnique({
        where: { key: `merchant_session_${token}` },
      });

      if (!sessionConfig) {
        console.log('Merchant session not found');
        throw error(401, { error: "Invalid or expired merchant token" });
      }

      const session = JSON.parse(sessionConfig.value);
      
      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        // Delete expired session
        await db.systemConfig.delete({
          where: { key: `merchant_session_${token}` },
        });
        throw error(401, { error: "Merchant session expired" });
      }

      // Get merchant data
      const merchant = await db.merchant.findUnique({
        where: { id: session.merchantId },
      });

      if (!merchant) {
        throw error(404, { error: "Merchant not found" });
      }
      
      console.log('Merchant authenticated:', merchant.name);
      
      return {
        userType: 'MERCHANT' as UserType,
        merchantId: merchant.id,
        userName: merchant.name,
        userInfo: merchant,
        userId: null,
        agentId: null,
      };
    }
    
    // Return empty auth data to let routes handle the error
    console.log('No valid authentication token provided');
    return {
      userType: null,
      userId: null,
      agentId: null,
      merchantId: null,
      userName: null,
      userInfo: null,
    };
  });

export default (app: Elysia) =>
  app
    .use(supportAuthGuard)
    /* ───────────────── Get user's tickets ───────────────── */
    .get(
      "/tickets",
      async (context: any) => {
        // First check if auth was successful
        if (!context.userType) {
          console.log('ERROR: Authentication failed - no userType in context for GET /tickets');
          return context.error(401, { error: 'Authentication required. Please provide a valid x-trader-token, x-agent-token, or Authorization header.' });
        }
        
        const { userType, userId, agentId, merchantId } = context;
        const where: any = { userType };
        
        if (userType === 'TRADER' && userId) {
          where.userId = userId;
        } else if (userType === 'AGENT' && agentId) {
          where.agentId = agentId;
        } else if (userType === 'MERCHANT' && merchantId) {
          where.merchantId = merchantId;
        }
        
        const tickets = await db.supportTicket.findMany({
          where,
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            _count: {
              select: {
                messages: {
                  where: {
                    isFromSupport: false,
                    readAt: null,
                  },
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        });
        
        return tickets.map(ticket => ({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          lastMessage: ticket.messages[0] || null,
          unreadCount: ticket._count.messages,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
        }));
      },
      {
        tags: ["support"],
        detail: { summary: "Получение списка тикетов пользователя" },
        response: {
          200: t.Array(t.Object({
            id: t.String(),
            subject: t.String(),
            status: t.String(),
            priority: t.String(),
            lastMessage: t.Nullable(t.Object({
              id: t.String(),
              message: t.String(),
              isFromSupport: t.Boolean(),
              createdAt: t.String(),
            })),
            unreadCount: t.Number(),
            createdAt: t.String(),
            updatedAt: t.String(),
          })),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Create new ticket ───────────────── */
    .post(
      "/tickets",
      async (context: any) => {
        try {
          // First check if auth was successful
          if (!context.userType) {
            console.log('ERROR: Authentication failed - no userType in context');
            console.log('Context keys:', Object.keys(context));
            return context.error(401, { error: 'Authentication required. Please provide a valid x-trader-token, x-agent-token, or Authorization header.' });
          }
          
          const { body, error, set, userType, userId, agentId, merchantId, userName } = context;
          
          console.log('Creating ticket:', {
            hasBody: !!body,
            bodyContent: body,
            userType,
            userId,
            agentId,
            merchantId,
            userName
          });
          
          const ticket = await db.supportTicket.create({
            data: {
              subject: body.subject,
              priority: body.priority || 'NORMAL',
              userType: userType as UserType,
              userId: userType === 'TRADER' ? userId : null,
              agentId: userType === 'AGENT' ? agentId : null,
              merchantId: userType === 'MERCHANT' ? merchantId : null,
              messages: {
                create: {
                  message: body.message,
                  isFromSupport: false,
                  authorName: userName,
                },
              },
            },
            include: {
              messages: true,
            },
          });
          
          set.status = 201;
          
          return {
            id: ticket.id,
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,
            messages: ticket.messages.map(msg => ({
              ...msg,
              createdAt: msg.createdAt.toISOString(),
            })),
            createdAt: ticket.createdAt.toISOString(),
          };
        } catch (err) {
          console.error('Error creating ticket:', err);
          return error(500, { error: 'Failed to create ticket: ' + (err instanceof Error ? err.message : 'Unknown error') });
        }
      },
      {
        tags: ["support"],
        detail: { summary: "Создание нового тикета" },
        body: t.Object({
          subject: t.String(),
          message: t.String(),
          priority: t.Optional(t.Enum(SupportTicketPriority)),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            subject: t.String(),
            status: t.String(),
            priority: t.String(),
            messages: t.Array(t.Object({
              id: t.String(),
              message: t.String(),
              isFromSupport: t.Boolean(),
              authorName: t.Nullable(t.String()),
              createdAt: t.String(),
            })),
            createdAt: t.String(),
          }),
          401: ErrorSchema,
          500: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Get ticket details ───────────────── */
    .get(
      "/tickets/:ticketId",
      async (context: any) => {
        // First check if auth was successful
        if (!context.userType) {
          return context.error(401, { error: 'Authentication required. Please provide a valid x-trader-token, x-agent-token, or Authorization header.' });
        }
        
        const { params, userType, userId, agentId, merchantId, error } = context;
        const where: any = { id: params.ticketId, userType };
        
        if (userType === 'TRADER' && userId) {
          where.userId = userId;
        } else if (userType === 'AGENT' && agentId) {
          where.agentId = agentId;
        } else if (userType === 'MERCHANT' && merchantId) {
          where.merchantId = merchantId;
        }
        
        const ticket = await db.supportTicket.findFirst({
          where,
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
            user: userType === 'TRADER' ? true : false,
            agent: userType === 'AGENT' ? true : false,
            merchant: userType === 'MERCHANT' ? true : false,
          },
        });
        
        if (!ticket) {
          return error(404, { error: "Тикет не найден" });
        }
        
        // Mark messages as read
        await db.supportMessage.updateMany({
          where: {
            ticketId: ticket.id,
            isFromSupport: true,
            readAt: null,
          },
          data: {
            readAt: new Date(),
          },
        });
        
        return {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
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
        tags: ["support"],
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
    
    /* ───────────────── Send message to ticket ───────────────── */
    .post(
      "/tickets/:ticketId/messages",
      async (context: any) => {
        // First check if auth was successful
        if (!context.userType) {
          return context.error(401, { error: 'Authentication required. Please provide a valid x-trader-token, x-agent-token, or Authorization header.' });
        }
        
        const { params, body, userType, userId, agentId, merchantId, userName, error } = context;
        const where: any = { id: params.ticketId, userType };
        
        if (userType === 'TRADER' && userId) {
          where.userId = userId;
        } else if (userType === 'AGENT' && agentId) {
          where.agentId = agentId;
        } else if (userType === 'MERCHANT' && merchantId) {
          where.merchantId = merchantId;
        }
        
        const ticket = await db.supportTicket.findFirst({ where });
        
        if (!ticket) {
          return error(404, { error: "Тикет не найден" });
        }
        
        if (ticket.status === 'CLOSED') {
          return error(400, { error: "Нельзя отправлять сообщения в закрытый тикет" });
        }
        
        const message = await db.supportMessage.create({
          data: {
            ticketId: ticket.id,
            message: body.message,
            isFromSupport: false,
            authorName: userName,
            attachments: body.attachments || [],
          },
        });
        
        // Update ticket status
        await db.supportTicket.update({
          where: { id: ticket.id },
          data: {
            status: 'WAITING_REPLY',
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
        tags: ["support"],
        detail: { summary: "Отправка сообщения в тикет" },
        params: t.Object({
          ticketId: t.String(),
        }),
        body: t.Object({
          message: t.String(),
          attachments: t.Optional(t.Array(t.String())),
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
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
        },
      },
    );