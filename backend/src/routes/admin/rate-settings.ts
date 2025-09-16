import { Elysia, t } from "elysia";
import { db } from "@/db";
import { KkkOperationType } from "@prisma/client";
import ErrorSchema from "@/types/error";

export default (app: Elysia) =>
  app

    /* ─────────── GET /admin/rate-settings ─────────── */
    .get(
      "",
      async () => {
        const settings = await db.rateSettings.findMany({
          include: {
            method: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return settings.map((s) => ({
          id: s.id,
          methodId: s.methodId,
          kkkPercent: s.kkkPercent,
          kkkOperation: s.kkkOperation,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          method: s.method,
        }));
      },
      {
        tags: ["admin"],
        detail: { summary: "Получение всех настроек ККК" },
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              methodId: t.String(),
              kkkPercent: t.Number(),
              kkkOperation: t.Enum(KkkOperationType),
              createdAt: t.String(),
              updatedAt: t.String(),
              method: t.Object({
                id: t.String(),
                code: t.String(),
                name: t.String(),
                type: t.String(),
              }),
            })
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ─────────── GET /admin/rate-settings/:methodId ─────────── */
    .get(
      "/:methodId",
      async ({ params, error }) => {
        const setting = await db.rateSettings.findUnique({
          where: { methodId: params.methodId },
          include: {
            method: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
        });

        if (!setting) {
          return error(404, { error: "Настройки для метода не найдены" });
        }

        return {
          id: setting.id,
          methodId: setting.methodId,
          kkkPercent: setting.kkkPercent,
          createdAt: setting.createdAt.toISOString(),
          updatedAt: setting.updatedAt.toISOString(),
          method: setting.method,
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Получение настроек ККК для конкретного метода" },
        params: t.Object({
          methodId: t.String({ description: "ID метода" }),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            methodId: t.String(),
            kkkPercent: t.Number(),
            createdAt: t.String(),
            updatedAt: t.String(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.String(),
            }),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      }
    )

    /* ─────────── POST /admin/rate-settings ─────────── */
    .post(
      "",
      async ({ body, error }) => {
        // Проверяем, существует ли метод
        const method = await db.method.findUnique({
          where: { id: body.methodId },
        });

        if (!method) {
          return error(404, { error: "Метод не найден" });
        }

        // Проверяем, нет ли уже настроек для этого метода
        const existing = await db.rateSettings.findUnique({
          where: { methodId: body.methodId },
        });

        if (existing) {
          return error(409, {
            error: "Настройки для этого метода уже существуют",
          });
        }

        const setting = await db.rateSettings.create({
          data: {
            methodId: body.methodId,
            kkkPercent: body.kkkPercent,
          },
          include: {
            method: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
        });

        return {
          id: setting.id,
          methodId: setting.methodId,
          kkkPercent: setting.kkkPercent,
          kkkOperation: setting.kkkOperation,
          createdAt: setting.createdAt.toISOString(),
          updatedAt: setting.updatedAt.toISOString(),
          method: setting.method,
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Создание настроек ККК для метода" },
        body: t.Object({
          methodId: t.String({ description: "ID метода" }),
          kkkPercent: t.Number({
            description: "Процент ККК (коэффициент корректировки курса)",
            minimum: 0,
            maximum: 100,
          }),
          kkkOperation: t.Optional(t.Enum(KkkOperationType, {
            description: "Операция ККК (PLUS или MINUS)"
          })),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            methodId: t.String(),
            kkkPercent: t.Number(),
            createdAt: t.String(),
            updatedAt: t.String(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.String(),
            }),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
          409: ErrorSchema,
        },
      }
    )

    /* ─────────── PUT /admin/rate-settings/:methodId ─────────── */
    .put(
      "/:methodId",
      async ({ params, body, error }) => {
        const setting = await db.rateSettings.findUnique({
          where: { methodId: params.methodId },
        });

        if (!setting) {
          return error(404, { error: "Настройки для метода не найдены" });
        }

        const updated = await db.rateSettings.update({
          where: { methodId: params.methodId },
          data: {
            kkkPercent: body.kkkPercent,
          },
          include: {
            method: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
        });

        return {
          id: updated.id,
          methodId: updated.methodId,
          kkkPercent: updated.kkkPercent,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          method: updated.method,
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Обновление настроек ККК для метода" },
        params: t.Object({
          methodId: t.String({ description: "ID метода" }),
        }),
        body: t.Object({
          kkkPercent: t.Number({
            description: "Процент ККК (коэффициент корректировки курса)",
            minimum: 0,
            maximum: 100,
          }),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            methodId: t.String(),
            kkkPercent: t.Number(),
            createdAt: t.String(),
            updatedAt: t.String(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.String(),
            }),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      }
    )

    /* ─────────── DELETE /admin/rate-settings/:methodId ─────────── */
    .delete(
      "/:methodId",
      async ({ params, error }) => {
        const setting = await db.rateSettings.findUnique({
          where: { methodId: params.methodId },
        });

        if (!setting) {
          return error(404, { error: "Настройки для метода не найдены" });
        }

        await db.rateSettings.delete({
          where: { methodId: params.methodId },
        });

        return { success: true };
      },
      {
        tags: ["admin"],
        detail: { summary: "Удаление настроек ККК для метода" },
        params: t.Object({
          methodId: t.String({ description: "ID метода" }),
        }),
        response: {
          200: t.Object({ success: t.Boolean() }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      }
    );