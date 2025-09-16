import Elysia, { t } from "elysia";
import { db } from "../../db";

export const traderFiltersApi = new Elysia({ prefix: "/filters" })
  // Get saved filters
  .get("/", async ({ trader }) => {
    try {
      const filters = await db.payoutFilters.findUnique({
        where: { userId: trader.id },
      });

      if (!filters) {
        // Return default filters
        return {
          success: true,
          filters: {
            trafficTypes: [],
            bankTypes: [],
            maxPayoutAmount: 0,
          },
        };
      }

      return {
        success: true,
        filters: {
          trafficTypes: filters.trafficTypes,
          bankTypes: filters.bankTypes,
          maxPayoutAmount: filters.maxPayoutAmount,
        },
      };
    } catch (error: any) {
      return { error: error.message };
    }
  })
  
  // Save filters
  .put(
    "/",
    async ({ body, trader }) => {
      try {
        const filters = await db.payoutFilters.upsert({
          where: { userId: trader.id },
          update: {
            trafficTypes: body.trafficTypes,
            bankTypes: body.bankTypes,
            maxPayoutAmount: body.maxPayoutAmount,
            updatedAt: new Date(),
          },
          create: {
            userId: trader.id,
            trafficTypes: body.trafficTypes,
            bankTypes: body.bankTypes,
            maxPayoutAmount: body.maxPayoutAmount,
          },
        });

        return {
          success: true,
          filters,
        };
      } catch (error: any) {
        return { error: error.message };
      }
    },
    {
      body: t.Object({
        trafficTypes: t.Array(t.String()),
        bankTypes: t.Array(t.String()),
        maxPayoutAmount: t.Number({ minimum: 0 }),
      }),
    }
  );