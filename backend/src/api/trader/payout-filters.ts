import Elysia, { t } from "elysia";
import { db } from "@/db";

export const payoutFiltersApi = new Elysia({ prefix: "/payout-filters" })
  // Get trader's payout filters
  .get(
    "/",
    async ({ trader }) => {
      const filters = await db.payoutFilters.findUnique({
        where: { userId: trader.id },
      });

      // Return default filters if none exist
      if (!filters) {
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
    }
  )
  
  // Update trader's payout filters
  .put(
    "/",
    async ({ trader, body, set }) => {
      try {
        const filters = await db.payoutFilters.upsert({
          where: { userId: trader.id },
          update: {
            trafficTypes: body.trafficTypes || [],
            bankTypes: body.bankTypes || [],
            maxPayoutAmount: body.maxPayoutAmount || 0,
          },
          create: {
            userId: trader.id,
            trafficTypes: body.trafficTypes || [],
            bankTypes: body.bankTypes || [],
            maxPayoutAmount: body.maxPayoutAmount || 0,
          },
        });

        // Update user's payout balance if maxPayoutAmount changed
        if (body.maxPayoutAmount !== undefined) {
          await db.user.update({
            where: { id: trader.id },
            data: { payoutBalance: body.maxPayoutAmount },
          });
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
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      body: t.Object({
        trafficTypes: t.Optional(t.Array(t.String())),
        bankTypes: t.Optional(t.Array(t.String())),
        maxPayoutAmount: t.Optional(t.Number({ minimum: 0 })),
      }),
    }
  );