import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { adminGuard } from "@/middleware/adminGuard";

export default (app: Elysia) =>
  app
    // Получить настройки пополнения
    .get(
      "",
      async ({ error }) => {
        let settings = await db.topupSettings.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        });

        // Если настроек нет, создаем дефолтные
        if (!settings) {
          settings = await db.topupSettings.create({
            data: {
              walletAddress: "TAfYiMZzP5XR1T6qCy3oXNkU4sfmAbC9qw",
              network: "TRC-20",
              minAmount: 10,
              confirmations: 1,
              isActive: true,
            },
          });
        }

        return {
          id: settings.id,
          walletAddress: settings.walletAddress,
          network: settings.network,
          minAmount: settings.minAmount,
          confirmations: settings.confirmations,
          isActive: settings.isActive,
          createdAt: settings.createdAt.toISOString(),
          updatedAt: settings.updatedAt.toISOString(),
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Получить настройки пополнения" },
        response: {
          200: t.Object({
            id: t.String(),
            walletAddress: t.String(),
            network: t.String(),
            minAmount: t.Number(),
            confirmations: t.Number(),
            isActive: t.Boolean(),
            createdAt: t.String(),
            updatedAt: t.String(),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    // Обновить настройки пополнения
    .put(
      "",
      async ({ body, error }) => {
        const settings = await db.topupSettings.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        });

        if (!settings) {
          return error(404, { error: "Настройки не найдены" });
        }

        const updated = await db.topupSettings.update({
          where: { id: settings.id },
          data: {
            walletAddress: body.walletAddress,
            network: body.network,
            minAmount: body.minAmount,
            confirmations: body.confirmations,
            isActive: body.isActive,
          },
        });

        return {
          id: updated.id,
          walletAddress: updated.walletAddress,
          network: updated.network,
          minAmount: updated.minAmount,
          confirmations: updated.confirmations,
          isActive: updated.isActive,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Обновить настройки пополнения" },
        body: t.Object({
          walletAddress: t.String({ minLength: 1 }),
          network: t.String({ minLength: 1 }),
          minAmount: t.Number({ minimum: 0 }),
          confirmations: t.Number({ minimum: 1 }),
          isActive: t.Boolean(),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            walletAddress: t.String(),
            network: t.String(),
            minAmount: t.Number(),
            confirmations: t.Number(),
            isActive: t.Boolean(),
            createdAt: t.String(),
            updatedAt: t.String(),
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      },
    );