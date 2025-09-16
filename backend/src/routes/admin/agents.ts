import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Prisma } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { randomBytes } from "node:crypto";
import { sha256 } from "@/utils/hash";

const authHeader = t.Object({ "x-admin-key": t.String() });

export default (app: Elysia) =>
  app
    /* ───────────────── Get all agents ───────────────── */
    .get(
      "/agents",
      async () => {
        const agents = await db.agent.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            commissionRate: true,
            trcWallet: true,
            createdAt: true,
            _count: {
              select: {
                agentTraders: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Calculate earnings for each agent
        const agentsWithEarnings = await Promise.all(
          agents.map(async (agent) => {
            // Get all traders assigned to this agent
            const agentTraders = await db.agentTrader.findMany({
              where: { agentId: agent.id },
              select: { traderId: true },
            });

            const traderIds = agentTraders.map(at => at.traderId);

            // Calculate earnings from transactions
            const transactions = await db.transaction.findMany({
              where: {
                traderId: { in: traderIds },
                status: 'READY',
              },
              select: {
                commission: true,
              },
            });

            const totalEarnings = transactions.reduce((sum, tx) => {
              return sum + (tx.commission * agent.commissionRate / 100);
            }, 0);

            return {
              ...agent,
              tradersCount: agent._count.agentTraders,
              totalEarnings,
              createdAt: agent.createdAt.toISOString(),
            };
          })
        );

        return agentsWithEarnings;
      },
      {
        tags: ["admin"],
        headers: authHeader,
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              email: t.String(),
              name: t.String(),
              commissionRate: t.Number(),
              trcWallet: t.Nullable(t.String()),
              tradersCount: t.Number(),
              totalEarnings: t.Number(),
              createdAt: t.String(),
            })
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Get agent by ID ───────────────── */
    .get(
      "/agents/:id",
      async ({ params, error }) => {
        try {
          const agent = await db.agent.findUniqueOrThrow({
            where: { id: params.id },
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
                  team: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              agentPayouts: {
                orderBy: { createdAt: 'desc' },
                take: 10,
              },
              teams: {
                select: {
                  id: true,
                  name: true,
                  createdAt: true,
                  _count: {
                    select: {
                      traders: true,
                    },
                  },
                },
              },
            },
          });

          // Calculate earnings for date range
          const traderIds = agent.agentTraders.map(at => at.traderId);
          
          const last30Days = new Date();
          last30Days.setDate(last30Days.getDate() - 30);

          const transactions = await db.transaction.findMany({
            where: {
              traderId: { in: traderIds },
              status: 'READY',
              createdAt: { gte: last30Days },
            },
            select: {
              commission: true,
              createdAt: true,
            },
          });

          const earnings30Days = transactions.reduce((sum, tx) => {
            return sum + (tx.commission * agent.commissionRate / 100);
          }, 0);

          return {
            ...agent,
            earnings30Days,
            createdAt: agent.createdAt.toISOString(),
            updatedAt: agent.updatedAt.toISOString(),
            agentTraders: agent.agentTraders.map(at => ({
              ...at,
              createdAt: at.createdAt.toISOString(),
              team: at.team,
            })),
            agentPayouts: agent.agentPayouts.map(ap => ({
              ...ap,
              createdAt: ap.createdAt.toISOString(),
              paidAt: ap.paidAt?.toISOString() || null,
              periodStart: ap.periodStart.toISOString(),
              periodEnd: ap.periodEnd.toISOString(),
            })),
            teams: agent.teams.map(team => ({
              ...team,
              createdAt: team.createdAt.toISOString(),
              tradersCount: team._count.traders,
            })),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Агент не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
            commissionRate: t.Number(),
            trcWallet: t.Nullable(t.String()),
            earnings30Days: t.Number(),
            createdAt: t.String(),
            updatedAt: t.String(),
            agentTraders: t.Array(
              t.Object({
                id: t.String(),
                agentId: t.String(),
                traderId: t.String(),
                createdAt: t.String(),
                trader: t.Object({
                  id: t.String(),
                  email: t.String(),
                  name: t.String(),
                  balanceUsdt: t.Number(),
                  balanceRub: t.Number(),
                }),
                team: t.Nullable(t.Object({
                  id: t.String(),
                  name: t.String(),
                })),
              })
            ),
            agentPayouts: t.Array(
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
            teams: t.Array(
              t.Object({
                id: t.String(),
                name: t.String(),
                createdAt: t.String(),
                tradersCount: t.Number(),
              })
            ),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Create agent ───────────────── */
    .post(
      "/agents",
      async ({ body, error }) => {
        try {
          const plainPassword = randomBytes(8).toString("hex");
          const hashedPassword = await sha256(plainPassword);

          const agent = await db.agent.create({
            data: {
              email: body.email,
              password: hashedPassword,
              name: body.name,
              commissionRate: body.commissionRate,
              trcWallet: body.trcWallet,
            },
            select: {
              id: true,
              email: true,
              name: true,
              commissionRate: true,
              trcWallet: true,
              createdAt: true,
            },
          });

          return {
            ...agent,
            plainPassword,
            createdAt: agent.createdAt.toISOString(),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          )
            return error(409, { error: "Агент с таким email уже существует" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        body: t.Object({
          email: t.String({ format: "email" }),
          name: t.String(),
          commissionRate: t.Number({ minimum: 0, maximum: 100 }),
          trcWallet: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
            commissionRate: t.Number(),
            trcWallet: t.Nullable(t.String()),
            plainPassword: t.String(),
            createdAt: t.String(),
          }),
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Update agent ───────────────── */
    .put(
      "/agents/:id",
      async ({ params, body, error }) => {
        try {
          const agent = await db.agent.update({
            where: { id: params.id },
            data: {
              email: body.email,
              name: body.name,
              commissionRate: body.commissionRate,
              trcWallet: body.trcWallet,
            },
            select: {
              id: true,
              email: true,
              name: true,
              commissionRate: true,
              trcWallet: true,
              updatedAt: true,
            },
          });

          return {
            ...agent,
            updatedAt: agent.updatedAt.toISOString(),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Агент не найден" });
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          )
            return error(409, { error: "Агент с таким email уже существует" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          email: t.String({ format: "email" }),
          name: t.String(),
          commissionRate: t.Number({ minimum: 0, maximum: 100 }),
          trcWallet: t.Optional(t.Nullable(t.String())),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
            commissionRate: t.Number(),
            trcWallet: t.Nullable(t.String()),
            updatedAt: t.String(),
          }),
          404: ErrorSchema,
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Delete agent ───────────────── */
    .delete(
      "/agents/:id",
      async ({ params, error }) => {
        try {
          await db.agent.delete({
            where: { id: params.id },
          });
          return { ok: true };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Агент не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Assign trader to agent ───────────────── */
    .post(
      "/agents/:id/traders",
      async ({ params, body, error }) => {
        try {
          // Check if agent exists
          await db.agent.findUniqueOrThrow({
            where: { id: params.id },
          });

          // Check if trader exists
          await db.user.findUniqueOrThrow({
            where: { id: body.traderId },
          });

          // Check if relation already exists
          const existing = await db.agentTrader.findUnique({
            where: {
              agentId_traderId: {
                agentId: params.id,
                traderId: body.traderId,
              },
            },
          });

          if (existing) {
            return error(409, { error: "Трейдер уже привязан к этому агенту" });
          }

          const agentTrader = await db.agentTrader.create({
            data: {
              agentId: params.id,
              traderId: body.traderId,
            },
            include: {
              trader: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          });

          return {
            ...agentTrader,
            createdAt: agentTrader.createdAt.toISOString(),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Агент или трейдер не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          traderId: t.String(),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            agentId: t.String(),
            traderId: t.String(),
            createdAt: t.String(),
            trader: t.Object({
              id: t.String(),
              email: t.String(),
              name: t.String(),
            }),
          }),
          404: ErrorSchema,
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Remove trader from agent ───────────────── */
    .delete(
      "/agents/:id/traders/:traderId",
      async ({ params, error }) => {
        try {
          await db.agentTrader.delete({
            where: {
              agentId_traderId: {
                agentId: params.id,
                traderId: params.traderId,
              },
            },
          });
          return { ok: true };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Связь агент-трейдер не найдена" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ 
          id: t.String(),
          traderId: t.String(),
        }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Get available traders for agent ───────────────── */
    .get(
      "/agents/:id/available-traders",
      async ({ params }) => {
        // Get all traders
        const allTraders = await db.user.findMany({
          where: {
            banned: false,
          },
          select: {
            id: true,
            email: true,
            name: true,
            balanceUsdt: true,
            balanceRub: true,
          },
        });

        // Get traders already assigned to any agent
        const assignedTraders = await db.agentTrader.findMany({
          select: {
            traderId: true,
          },
        });

        const assignedTraderIds = new Set(assignedTraders.map(at => at.traderId));

        // Filter out assigned traders
        const availableTraders = allTraders.filter(
          trader => !assignedTraderIds.has(trader.id)
        );

        return availableTraders;
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              email: t.String(),
              name: t.String(),
              balanceUsdt: t.Number(),
              balanceRub: t.Number(),
            })
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Get teams grouped by agent ───────────────── */
    .get(
      "/agents/teams",
      async () => {
        const teams = await db.team.findMany({
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                traders: true,
              },
            },
          },
          orderBy: [
            { agentId: 'asc' },
            { name: 'asc' },
          ],
        });

        // Group teams by agent
        const groupedByAgent = teams.reduce((acc, team) => {
          const agentId = team.agentId;
          if (!acc[agentId]) {
            acc[agentId] = {
              agent: team.agent,
              teams: [],
            };
          }
          acc[agentId].teams.push({
            id: team.id,
            name: team.name,
            tradersCount: team._count.traders,
            createdAt: team.createdAt.toISOString(),
            updatedAt: team.updatedAt.toISOString(),
          });
          return acc;
        }, {} as Record<string, any>);

        return Object.values(groupedByAgent);
      },
      {
        tags: ["admin"],
        headers: authHeader,
        response: {
          200: t.Array(
            t.Object({
              agent: t.Object({
                id: t.String(),
                name: t.String(),
                email: t.String(),
              }),
              teams: t.Array(
                t.Object({
                  id: t.String(),
                  name: t.String(),
                  tradersCount: t.Number(),
                  createdAt: t.String(),
                  updatedAt: t.String(),
                })
              ),
            })
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Create team for agent ───────────────── */
    .post(
      "/agents/:id/teams",
      async ({ params, body, error }) => {
        try {
          // Check if agent exists
          await db.agent.findUniqueOrThrow({
            where: { id: params.id },
          });

          // Check if team name already exists for this agent
          const existing = await db.team.findUnique({
            where: {
              agentId_name: {
                agentId: params.id,
                name: body.name,
              },
            },
          });

          if (existing) {
            return error(409, { error: "Команда с таким названием уже существует для этого агента" });
          }

          const team = await db.team.create({
            data: {
              name: body.name,
              agentId: params.id,
            },
          });

          return {
            ...team,
            createdAt: team.createdAt.toISOString(),
            updatedAt: team.updatedAt.toISOString(),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Агент не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          name: t.String(),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            name: t.String(),
            agentId: t.String(),
            createdAt: t.String(),
            updatedAt: t.String(),
          }),
          404: ErrorSchema,
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Calculate agent earnings ───────────────── */
    .get(
      "/agents/:id/earnings",
      async ({ params, query, error }) => {
        try {
          const agent = await db.agent.findUniqueOrThrow({
            where: { id: params.id },
          });

          // Get traders assigned to this agent
          const agentTraders = await db.agentTrader.findMany({
            where: { agentId: params.id },
            select: { traderId: true },
          });

          const traderIds = agentTraders.map(at => at.traderId);

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
            },
          });

          // Calculate earnings by trader
          const earningsByTrader: Record<string, number> = {};
          const totalEarnings = transactions.reduce((sum, tx) => {
            const earning = tx.commission * agent.commissionRate / 100;
            earningsByTrader[tx.traderId] = (earningsByTrader[tx.traderId] || 0) + earning;
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
            earnings: earningsByTrader[trader.id] || 0,
          }));

          return {
            totalEarnings,
            commissionRate: agent.commissionRate,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            traders: tradersWithEarnings,
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Агент не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
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
              })
            ),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Get agent merchants ───────────────── */
    .get(
      "/agents/:id/merchants",
      async ({ params, error }) => {
        try {
          const agent = await db.agent.findUniqueOrThrow({
            where: { id: params.id },
          });

          // Get all traders assigned to this agent
          const agentTraders = await db.agentTrader.findMany({
            where: { agentId: params.id },
            select: { traderId: true },
          });

          const traderIds = agentTraders.map(at => at.traderId);

          // Get all merchant connections for these traders
          const merchants = await db.traderMerchant.findMany({
            where: {
              traderId: { in: traderIds },
            },
            include: {
              trader: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
              merchant: {
                select: {
                  id: true,
                  name: true,
                  token: true,
                },
              },
              method: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          });

          return {
            merchants: merchants.map(tm => ({
              id: tm.id,
              merchantId: tm.merchant.id,
              merchantCode: tm.merchant.token,
              merchantName: tm.merchant.name,
              method: tm.method.name,
              methodCode: tm.method.code,
              feeIn: tm.feeIn,
              feeOut: tm.feeOut,
              isFeeInEnabled: tm.isFeeInEnabled,
              isFeeOutEnabled: tm.isFeeOutEnabled,
              isMerchantEnabled: tm.isMerchantEnabled,
              trader: tm.trader,
            })),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Агент не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            merchants: t.Array(
              t.Object({
                id: t.String(),
                merchantId: t.String(),
                merchantCode: t.String(),
                merchantName: t.String(),
                method: t.String(),
                methodCode: t.String(),
                feeIn: t.Number(),
                feeOut: t.Number(),
                isFeeInEnabled: t.Boolean(),
                isFeeOutEnabled: t.Boolean(),
                isMerchantEnabled: t.Boolean(),
                trader: t.Object({
                  id: t.String(),
                  email: t.String(),
                  name: t.String(),
                }),
              })
            ),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Get available merchants for agent ───────────────── */
    .get(
      "/agents/:id/available-merchants",
      async ({ params, error }) => {
        try {
          const agent = await db.agent.findUniqueOrThrow({
            where: { id: params.id },
          });

          // Get all traders assigned to this agent
          const agentTraders = await db.agentTrader.findMany({
            where: { agentId: params.id },
            select: { traderId: true },
          });

          const traderIds = agentTraders.map(at => at.traderId);

          // Get all merchant-method combinations already used by these traders
          const existingMerchants = await db.traderMerchant.findMany({
            where: {
              traderId: { in: traderIds },
            },
            select: {
              merchantId: true,
              methodId: true,
            },
          });

          const existingCombinations = new Set(
            existingMerchants.map(tm => `${tm.merchantId}-${tm.methodId}`)
          );

          // Get all available merchants with their methods
          const merchants = await db.merchant.findMany({
            where: {
              disabled: false,
              banned: false,
            },
            include: {
              merchantMethods: {
                include: {
                  method: true,
                },
              },
            },
          });

          // Filter out already assigned merchant-method combinations
          const availableMerchants = merchants.map(merchant => ({
            id: merchant.id,
            name: merchant.name,
            token: merchant.token,
            methods: merchant.merchantMethods
              .filter(mm => !existingCombinations.has(`${merchant.id}-${mm.methodId}`))
              .map(mm => ({
                id: mm.method.id,
                code: mm.method.code,
                name: mm.method.name,
                type: mm.method.type,
              })),
          })).filter(merchant => merchant.methods.length > 0);

          return availableMerchants;
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Агент не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              name: t.String(),
              token: t.String(),
              methods: t.Array(
                t.Object({
                  id: t.String(),
                  code: t.String(),
                  name: t.String(),
                  type: t.String(),
                })
              ),
            })
          ),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Add merchant to all agent traders ───────────────── */
    .post(
      "/agents/:id/merchants",
      async ({ params, body, error }) => {
        try {
          const agent = await db.agent.findUniqueOrThrow({
            where: { id: params.id },
          });

          // Get all traders assigned to this agent
          const agentTraders = await db.agentTrader.findMany({
            where: { agentId: params.id },
            select: { traderId: true },
          });

          const traderIds = agentTraders.map(at => at.traderId);

          if (traderIds.length === 0) {
            return error(400, { error: "У агента нет привязанных трейдеров" });
          }

          // Check if merchant and method exist
          const merchant = await db.merchant.findUnique({
            where: { id: body.merchantId },
          });
          
          const method = await db.method.findUnique({
            where: { id: body.methodId },
          });

          if (!merchant || !method) {
            return error(404, { error: "Мерчант или метод не найден" });
          }

          // Check if any trader already has this merchant-method combination
          const existingConnections = await db.traderMerchant.findMany({
            where: {
              traderId: { in: traderIds },
              merchantId: body.merchantId,
              methodId: body.methodId,
            },
          });

          if (existingConnections.length > 0) {
            return error(409, { error: "Этот мерчант уже привязан к одному или нескольким трейдерам" });
          }

          // Add merchant-method combination to all traders
          const traderMerchants = await Promise.all(
            traderIds.map(traderId =>
              db.traderMerchant.create({
                data: {
                  traderId,
                  merchantId: body.merchantId,
                  methodId: body.methodId,
                  feeIn: body.feeIn || 0,
                  feeOut: body.feeOut || 0,
                  isFeeInEnabled: true,
                  isFeeOutEnabled: true,
                  isMerchantEnabled: true,
                },
                include: {
                  trader: {
                    select: {
                      id: true,
                      email: true,
                      name: true,
                    },
                  },
                  merchant: {
                    select: {
                      id: true,
                      name: true,
                      token: true,
                    },
                  },
                  method: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                    },
                  },
                },
              })
            )
          );

          return {
            success: true,
            addedCount: traderMerchants.length,
            merchants: traderMerchants.map(tm => ({
              id: tm.id,
              merchantId: tm.merchant.id,
              merchantCode: tm.merchant.token,
              merchantName: tm.merchant.name,
              method: tm.method.name,
              methodCode: tm.method.code,
              feeIn: tm.feeIn,
              feeOut: tm.feeOut,
              isFeeInEnabled: tm.isFeeInEnabled,
              isFeeOutEnabled: tm.isFeeOutEnabled,
              isMerchantEnabled: tm.isMerchantEnabled,
              trader: tm.trader,
            })),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Агент не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          merchantId: t.String(),
          methodId: t.String(),
          feeIn: t.Optional(t.Number()),
          feeOut: t.Optional(t.Number()),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            addedCount: t.Number(),
            merchants: t.Array(
              t.Object({
                id: t.String(),
                merchantId: t.String(),
                merchantCode: t.String(),
                merchantName: t.String(),
                method: t.String(),
                methodCode: t.String(),
                feeIn: t.Number(),
                feeOut: t.Number(),
                isFeeInEnabled: t.Boolean(),
                isFeeOutEnabled: t.Boolean(),
                isMerchantEnabled: t.Boolean(),
                trader: t.Object({
                  id: t.String(),
                  email: t.String(),
                  name: t.String(),
                }),
              })
            ),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    );