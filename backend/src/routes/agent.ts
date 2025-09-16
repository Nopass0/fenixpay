import { Elysia, t } from "elysia";
import { db } from "@/db";
import { sha256 } from "@/utils/hash";
import { Prisma } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { randomBytes } from "node:crypto";

const authHeader = t.Object({ "x-agent-token": t.String() });

export default (app: Elysia) =>
  app
    /* ───────────────── Login ───────────────── */
    .post(
      "/agent/login",
      async ({ body, request, error }) => {
        const hash = await sha256(body.password);
        
        try {
          const agent = await db.agent.findUniqueOrThrow({
            where: { email: body.email },
          });
          
          if (agent.password !== hash) {
            return error(401, { error: "Неверный email или пароль" });
          }
          
          // Clean up expired sessions
          await db.agentSession.deleteMany({
            where: {
              agentId: agent.id,
              expiredAt: { lt: new Date() },
            },
          });
          
          // Create new session
          const token = randomBytes(32).toString("hex");
          const session = await db.agentSession.create({
            data: {
              token,
              ip: request.headers.get("x-forwarded-for") || "unknown",
              agentId: agent.id,
              expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
          });
          
          return {
            agent: {
              id: agent.id,
              email: agent.email,
              name: agent.name,
              commissionRate: agent.commissionRate,
              trcWallet: agent.trcWallet,
            },
            token: session.token,
          };
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError) {
            return error(401, { error: "Неверный email или пароль" });
          }
          throw e;
        }
      },
      {
        tags: ["agent"],
        body: t.Object({
          email: t.String({ format: "email" }),
          password: t.String(),
        }),
        response: {
          200: t.Object({
            agent: t.Object({
              id: t.String(),
              email: t.String(),
              name: t.String(),
              commissionRate: t.Number(),
              trcWallet: t.Nullable(t.String()),
            }),
            token: t.String(),
          }),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Verify ───────────────── */
    .get(
      "/agent/verify",
      async ({ request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          const session = await db.agentSession.findUniqueOrThrow({
            where: { token },
            include: {
              agent: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  commissionRate: true,
                  trcWallet: true,
                },
              },
            },
          });
          
          if (session.expiredAt < new Date()) {
            await db.agentSession.delete({ where: { id: session.id } });
            return error(401, { error: "Token expired" });
          }
          
          return { success: true, agent: session.agent };
        } catch (e) {
          return error(401, { error: "Invalid token" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        response: {
          200: t.Object({
            success: t.Boolean(),
            agent: t.Object({
              id: t.String(),
              email: t.String(),
              name: t.String(),
              commissionRate: t.Number(),
              trcWallet: t.Nullable(t.String()),
            }),
          }),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Logout ───────────────── */
    .post(
      "/agent/logout",
      async ({ request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          await db.agentSession.delete({ where: { token } });
          return { success: true };
        } catch (e) {
          return error(401, { error: "Invalid token" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        response: {
          200: t.Object({ success: t.Boolean() }),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Get profile ───────────────── */
    .get(
      "/agent/profile",
      async ({ request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          const session = await db.agentSession.findUniqueOrThrow({
            where: { token },
            include: {
              agent: {
                include: {
                  agentTraders: {
                    include: {
                      trader: {
                        select: {
                          id: true,
                          email: true,
                          name: true,
                          balanceUsdt: true,
                          balanceRub: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });
          
          if (session.expiredAt < new Date()) {
            await db.agentSession.delete({ where: { id: session.id } });
            return error(401, { error: "Token expired" });
          }
          
          const agent = session.agent;
          
          // Calculate team volume and earnings
          const traderIds = agent.agentTraders.map(at => at.traderId);
          
          const transactions = await db.transaction.findMany({
            where: {
              traderId: { in: traderIds },
              status: 'READY',
            },
            select: {
              amount: true,
              commission: true,
              type: true,
              createdAt: true,
            },
          });
          
          const teamVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
          const totalEarnings = transactions.reduce((sum, tx) => sum + (tx.commission * agent.commissionRate / 100), 0);
          
          return {
            agent: {
              id: agent.id,
              email: agent.email,
              name: agent.name,
              commissionRate: agent.commissionRate,
              trcWallet: agent.trcWallet,
              createdAt: agent.createdAt.toISOString(),
            },
            teamSize: agent.agentTraders.length,
            teamVolume,
            totalEarnings,
            traders: agent.agentTraders.map(at => ({
              ...at.trader,
              joinedAt: at.createdAt.toISOString(),
            })),
          };
        } catch (e) {
          return error(401, { error: "Invalid token" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        response: {
          200: t.Object({
            agent: t.Object({
              id: t.String(),
              email: t.String(),
              name: t.String(),
              commissionRate: t.Number(),
              trcWallet: t.Nullable(t.String()),
              createdAt: t.String(),
            }),
            teamSize: t.Number(),
            teamVolume: t.Number(),
            totalEarnings: t.Number(),
            traders: t.Array(
              t.Object({
                id: t.String(),
                email: t.String(),
                name: t.String(),
                balanceUsdt: t.Number(),
                balanceRub: t.Number(),
                joinedAt: t.String(),
              })
            ),
          }),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Update wallet ───────────────── */
    .put(
      "/agent/wallet",
      async ({ body, request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          const session = await db.agentSession.findUniqueOrThrow({
            where: { token },
          });
          
          if (session.expiredAt < new Date()) {
            await db.agentSession.delete({ where: { id: session.id } });
            return error(401, { error: "Token expired" });
          }
          
          const agent = await db.agent.update({
            where: { id: session.agentId },
            data: {
              trcWallet: body.trcWallet,
            },
            select: {
              id: true,
              trcWallet: true,
            },
          });
          
          return { success: true, trcWallet: agent.trcWallet };
        } catch (e) {
          return error(401, { error: "Invalid token" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        body: t.Object({
          trcWallet: t.String(),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            trcWallet: t.Nullable(t.String()),
          }),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Get earnings by date range ───────────────── */
    .get(
      "/agent/earnings",
      async ({ query, request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          const session = await db.agentSession.findUniqueOrThrow({
            where: { token },
            include: {
              agent: {
                include: {
                  agentTraders: true,
                },
              },
            },
          });
          
          if (session.expiredAt < new Date()) {
            await db.agentSession.delete({ where: { id: session.id } });
            return error(401, { error: "Token expired" });
          }
          
          const agent = session.agent;
          const traderIds = agent.agentTraders.map(at => at.traderId);
          
          // Parse date range
          const startDate = query.startDate ? new Date(query.startDate) : new Date(0);
          const endDate = query.endDate ? new Date(query.endDate) : new Date();
          
          // Get transactions in date range
          const transactions = await db.transaction.findMany({
            where: {
              traderId: { in: traderIds },
              status: 'READY',
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            select: {
              commission: true,
              createdAt: true,
              traderId: true,
              type: true,
              amount: true,
            },
          });
          
          // Calculate earnings by trader
          const earningsByTrader: Record<string, { earnings: number; volume: number }> = {};
          const totalEarnings = transactions.reduce((sum, tx) => {
            const earning = tx.commission * agent.commissionRate / 100;
            if (!earningsByTrader[tx.traderId]) {
              earningsByTrader[tx.traderId] = { earnings: 0, volume: 0 };
            }
            earningsByTrader[tx.traderId].earnings += earning;
            earningsByTrader[tx.traderId].volume += tx.amount;
            return sum + earning;
          }, 0);
          
          // Get trader details
          const traders = await db.user.findMany({
            where: { id: { in: traderIds } },
            select: {
              id: true,
              email: true,
              name: true,
            },
          });
          
          const tradersWithEarnings = traders.map(trader => ({
            ...trader,
            earnings: earningsByTrader[trader.id]?.earnings || 0,
            volume: earningsByTrader[trader.id]?.volume || 0,
          }));
          
          return {
            totalEarnings,
            commissionRate: agent.commissionRate,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            traders: tradersWithEarnings,
          };
        } catch (e) {
          return error(401, { error: "Invalid token" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        query: t.Object({
          startDate: t.Optional(t.String()),
          endDate: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            totalEarnings: t.Number(),
            commissionRate: t.Number(),
            startDate: t.String(),
            endDate: t.String(),
            traders: t.Array(
              t.Object({
                id: t.String(),
                email: t.String(),
                name: t.String(),
                earnings: t.Number(),
                volume: t.Number(),
              })
            ),
          }),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Get payout history ───────────────── */
    .get(
      "/agent/payouts",
      async ({ request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          const session = await db.agentSession.findUniqueOrThrow({
            where: { token },
          });
          
          if (session.expiredAt < new Date()) {
            await db.agentSession.delete({ where: { id: session.id } });
            return error(401, { error: "Token expired" });
          }
          
          const payouts = await db.agentPayout.findMany({
            where: { agentId: session.agentId },
            orderBy: { createdAt: 'desc' },
          });
          
          return payouts.map(payout => ({
            ...payout,
            createdAt: payout.createdAt.toISOString(),
            paidAt: payout.paidAt?.toISOString() || null,
            periodStart: payout.periodStart.toISOString(),
            periodEnd: payout.periodEnd.toISOString(),
          }));
        } catch (e) {
          return error(401, { error: "Invalid token" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              agentId: t.String(),
              amount: t.Number(),
              isPaid: t.Boolean(),
              paidAt: t.Nullable(t.String()),
              txHash: t.Nullable(t.String()),
              periodStart: t.String(),
              periodEnd: t.String(),
              earnings: t.Number(),
              createdAt: t.String(),
            })
          ),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Get teams ───────────────── */
    .get(
      "/agent/teams",
      async ({ request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          const session = await db.agentSession.findUniqueOrThrow({
            where: { token },
          });
          
          if (session.expiredAt < new Date()) {
            await db.agentSession.delete({ where: { id: session.id } });
            return error(401, { error: "Token expired" });
          }
          
          const teams = await db.team.findMany({
            where: { agentId: session.agentId },
            include: {
              traders: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  balanceUsdt: true,
                  balanceRub: true,
                  banned: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          });
          
          return {
            teams: teams.map(team => ({
              ...team,
              createdAt: team.createdAt.toISOString(),
              traders: team.traders.map(trader => ({
                ...trader,
                joinedAt: trader.createdAt.toISOString(),
                turnover: 0, // TODO: Calculate actual turnover
                teamId: team.id,
              })),
            })),
          };
        } catch (e) {
          return error(401, { error: "Invalid token" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        response: {
          200: t.Object({
            teams: t.Array(
              t.Object({
                id: t.String(),
                name: t.String(),
                agentId: t.String(),
                createdAt: t.String(),
                traders: t.Array(
                  t.Object({
                    id: t.String(),
                    email: t.String(),
                    name: t.String(),
                    balanceUsdt: t.Number(),
                    balanceRub: t.Number(),
                    banned: t.Boolean(),
                    joinedAt: t.String(),
                    turnover: t.Number(),
                    teamId: t.String(),
                  })
                ),
              })
            ),
          }),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Get all traders ───────────────── */
    .get(
      "/agent/traders",
      async ({ request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          const session = await db.agentSession.findUniqueOrThrow({
            where: { token },
            include: {
              agent: {
                include: {
                  agentTraders: {
                    include: {
                      trader: {
                        select: {
                          id: true,
                          email: true,
                          name: true,
                          balanceUsdt: true,
                          balanceRub: true,
                          banned: true,
                          createdAt: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });
          
          if (session.expiredAt < new Date()) {
            await db.agentSession.delete({ where: { id: session.id } });
            return error(401, { error: "Token expired" });
          }
          
          // Get team assignments for each trader
          const traderIds = session.agent.agentTraders.map(at => at.trader.id);
          const teams = await db.team.findMany({
            where: { agentId: session.agentId },
            include: {
              traders: {
                select: { id: true },
              },
            },
          });
          
          // Create a map of trader to team
          const traderTeamMap: Record<string, string> = {};
          teams.forEach(team => {
            team.traders.forEach(trader => {
              traderTeamMap[trader.id] = team.id;
            });
          });
          
          const traders = session.agent.agentTraders.map(at => ({
            ...at.trader,
            joinedAt: at.createdAt.toISOString(),
            turnover: 0, // TODO: Calculate actual turnover
            teamId: traderTeamMap[at.trader.id] || null,
          }));
          
          return { traders };
        } catch (e) {
          return error(401, { error: "Invalid token" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        response: {
          200: t.Object({
            traders: t.Array(
              t.Object({
                id: t.String(),
                email: t.String(),
                name: t.String(),
                balanceUsdt: t.Number(),
                balanceRub: t.Number(),
                banned: t.Boolean(),
                joinedAt: t.String(),
                turnover: t.Number(),
                teamId: t.Nullable(t.String()),
              })
            ),
          }),
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Create team ───────────────── */
    .post(
      "/agent/teams",
      async ({ body, request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          const session = await db.agentSession.findUniqueOrThrow({
            where: { token },
          });
          
          if (session.expiredAt < new Date()) {
            await db.agentSession.delete({ where: { id: session.id } });
            return error(401, { error: "Token expired" });
          }
          
          const team = await db.team.create({
            data: {
              name: body.name,
              agentId: session.agentId,
            },
          });
          
          return {
            team: {
              ...team,
              createdAt: team.createdAt.toISOString(),
              traders: [],
            },
          };
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === 'P2002') {
              return error(400, { error: "Команда с таким именем уже существует" });
            }
          }
          return error(400, { error: "Ошибка при создании команды" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        body: t.Object({
          name: t.String(),
        }),
        response: {
          200: t.Object({
            team: t.Object({
              id: t.String(),
              name: t.String(),
              agentId: t.String(),
              createdAt: t.String(),
              traders: t.Array(t.Any()),
            }),
          }),
          400: ErrorSchema,
          401: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Update team ───────────────── */
    .put(
      "/agent/teams/:teamId",
      async ({ params, body, request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          const session = await db.agentSession.findUniqueOrThrow({
            where: { token },
          });
          
          if (session.expiredAt < new Date()) {
            await db.agentSession.delete({ where: { id: session.id } });
            return error(401, { error: "Token expired" });
          }
          
          const team = await db.team.update({
            where: { 
              id: params.teamId,
              agentId: session.agentId,
            },
            data: {
              name: body.name,
            },
          });
          
          return {
            team: {
              ...team,
              createdAt: team.createdAt.toISOString(),
            },
          };
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === 'P2002') {
              return error(400, { error: "Команда с таким именем уже существует" });
            }
            if (e.code === 'P2025') {
              return error(404, { error: "Команда не найдена" });
            }
          }
          return error(400, { error: "Ошибка при обновлении команды" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        params: t.Object({
          teamId: t.String(),
        }),
        body: t.Object({
          name: t.String(),
        }),
        response: {
          200: t.Object({
            team: t.Object({
              id: t.String(),
              name: t.String(),
              agentId: t.String(),
              createdAt: t.String(),
              updatedAt: t.String(),
            }),
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Delete team ───────────────── */
    .delete(
      "/agent/teams/:teamId",
      async ({ params, request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          const session = await db.agentSession.findUniqueOrThrow({
            where: { token },
          });
          
          if (session.expiredAt < new Date()) {
            await db.agentSession.delete({ where: { id: session.id } });
            return error(401, { error: "Token expired" });
          }
          
          // First, remove all traders from this team
          await db.user.updateMany({
            where: {
              teams: {
                some: {
                  id: params.teamId,
                },
              },
            },
            data: {
              teams: {
                disconnect: {
                  id: params.teamId,
                },
              },
            },
          });
          
          // Then delete the team
          await db.team.delete({
            where: { 
              id: params.teamId,
              agentId: session.agentId,
            },
          });
          
          return { success: true };
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === 'P2025') {
              return error(404, { error: "Команда не найдена" });
            }
          }
          return error(400, { error: "Ошибка при удалении команды" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        params: t.Object({
          teamId: t.String(),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Move trader to team ───────────────── */
    .patch(
      "/agent/traders/:traderId/team",
      async ({ params, body, request, error }) => {
        const token = request.headers.get("x-agent-token");
        if (!token) {
          return error(401, { error: "Token required" });
        }
        
        try {
          const session = await db.agentSession.findUniqueOrThrow({
            where: { token },
          });
          
          if (session.expiredAt < new Date()) {
            await db.agentSession.delete({ where: { id: session.id } });
            return error(401, { error: "Token expired" });
          }
          
          // Verify trader belongs to this agent
          const agentTrader = await db.agentTrader.findUnique({
            where: {
              agentId_traderId: {
                agentId: session.agentId,
                traderId: params.traderId,
              },
            },
          });
          
          if (!agentTrader) {
            return error(404, { error: "Трейдер не найден" });
          }
          
          // Update trader's team
          if (body.teamId) {
            // Verify team belongs to this agent
            const team = await db.team.findUnique({
              where: {
                id: body.teamId,
                agentId: session.agentId,
              },
            });
            
            if (!team) {
              return error(404, { error: "Команда не найдена" });
            }
          }
          
          // Update trader's team (set to null if body.teamId is null)
          await db.user.update({
            where: { id: params.traderId },
            data: {
              teamId: body.teamId,
            },
          });
          
          // Also update AgentTrader relation
          await db.agentTrader.update({
            where: {
              agentId_traderId: {
                agentId: session.agentId,
                traderId: params.traderId,
              },
            },
            data: {
              teamId: body.teamId,
            },
          });
          
          return { success: true };
        } catch (e) {
          console.error('Error moving trader:', e);
          if (e instanceof Error) {
            return error(400, { error: e.message });
          }
          return error(400, { error: "Ошибка при перемещении трейдера" });
        }
      },
      {
        tags: ["agent"],
        headers: authHeader,
        params: t.Object({
          traderId: t.String(),
        }),
        body: t.Object({
          teamId: t.Nullable(t.String()),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
        },
      },
    );