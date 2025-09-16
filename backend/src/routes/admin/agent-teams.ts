import { Elysia, t } from "elysia";
import { db } from "@/db";

const ErrorSchema = t.Object({
  error: t.String(),
});

const authHeader = t.Object({
  "x-admin-key": t.String(),
});

export default new Elysia({ prefix: "/agents" })
  /* ───────────────── Get all agents with teams ───────────────── */
  .get(
    "/teams",
    async () => {
      const agents = await db.agent.findMany({
        include: {
          teams: true,
        },
        orderBy: {
          name: 'asc'
        }
      });

      return agents;
    },
    {
      tags: ["admin"],
      headers: authHeader,
      response: {
        200: t.Array(
          t.Object({
            id: t.String(),
            name: t.String(),
            email: t.String(),
            teams: t.Array(
              t.Object({
                id: t.String(),
                name: t.String(),
                agentId: t.String(),
              })
            )
          })
        ),
        401: ErrorSchema,
        403: ErrorSchema,
      },
    },
  )

  /* ───────────────── Create team for agent ───────────────── */
  .post(
    "/:id/teams",
    async ({ params, body, error }) => {
      const agent = await db.agent.findUnique({
        where: { id: params.id }
      });

      if (!agent) {
        return error(404, { error: "Агент не найден" });
      }

      // Check if team name already exists for this agent
      const existingTeam = await db.team.findUnique({
        where: {
          agentId_name: {
            agentId: params.id,
            name: body.name
          }
        }
      });

      if (existingTeam) {
        return error(409, { error: "Команда с таким названием уже существует" });
      }

      const team = await db.team.create({
        data: {
          name: body.name,
          agentId: params.id,
        }
      });

      return { success: true, team };
    },
    {
      tags: ["admin"],
      headers: authHeader,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.String({ minLength: 1 }),
      }),
      response: {
        200: t.Object({ 
          success: t.Boolean(),
          team: t.Object({
            id: t.String(),
            name: t.String(),
            agentId: t.String(),
            createdAt: t.Date(),
            updatedAt: t.Date(),
          })
        }),
        404: ErrorSchema,
        409: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    },
  )
  
  /* ───────────────── Get team details ───────────────── */
  .get(
    "/teams/:teamId",
    async ({ params, error }) => {
      const team = await db.team.findUnique({
        where: { id: params.teamId },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          traders: {
            include: {
              bankDetails: {
                where: { isArchived: false },
                select: { id: true }
              }
            }
          }
        }
      });

      if (!team) {
        return error(404, { error: "Команда не найдена" });
      }

      // Get turnover for each trader
      const traderIds = team.traders.map(t => t.id);
      const turnovers = await db.transaction.groupBy({
        by: ['traderId'],
        where: {
          traderId: { in: traderIds },
          status: 'READY',
          type: 'IN'
        },
        _sum: { amount: true }
      });

      const turnoverMap = Object.fromEntries(
        turnovers.map(t => [t.traderId, t._sum.amount ?? 0])
      );

      // Calculate statistics
      const statistics = {
        totalTurnover: turnovers.reduce((sum, t) => sum + (t._sum.amount ?? 0), 0),
        totalActiveRequisites: team.traders.reduce((sum, t) => sum + t.bankDetails.length, 0),
        totalBalance: team.traders.reduce((sum, t) => sum + t.balanceUsdt, 0),
      };

      return {
        ...team,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
        traders: team.traders.map(trader => ({
          id: trader.id,
          numericId: trader.numericId,
          email: trader.email,
          name: trader.name,
          balanceUsdt: trader.balanceUsdt,
          balanceRub: trader.balanceRub,
          activeRequisitesCount: trader.bankDetails.length,
          turnover: turnoverMap[trader.id] ?? 0,
        })),
        statistics,
      };
    },
    {
      tags: ["admin"],
      headers: authHeader,
      params: t.Object({ teamId: t.String() }),
      response: {
        200: t.Object({
          id: t.String(),
          name: t.String(),
          agentId: t.String(),
          agent: t.Object({
            id: t.String(),
            name: t.String(),
            email: t.String(),
          }),
          traders: t.Array(
            t.Object({
              id: t.String(),
              numericId: t.Number(),
              email: t.String(),
              name: t.String(),
              balanceUsdt: t.Number(),
              balanceRub: t.Number(),
              activeRequisitesCount: t.Number(),
              turnover: t.Number(),
            })
          ),
          statistics: t.Object({
            totalTurnover: t.Number(),
            totalActiveRequisites: t.Number(),
            totalBalance: t.Number(),
          }),
          createdAt: t.String(),
          updatedAt: t.String(),
        }),
        404: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    },
  );