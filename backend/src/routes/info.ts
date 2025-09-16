import { Elysia, t } from "elysia";
import { db } from "@/db";

export default (app: Elysia) => {
  app.get(
    "/connection",
    /* ─────────  Handler  ───────── */
    ({ request, ip }) => ({
      ip,
      userAgent: request.headers.get("user-agent") ?? "unknown",
    }),
    {
      /* ───────── Swagger / OpenAPI (рус.) ───────── */
      tags: ["info"],
      detail: {
        description:
          "Эндпоинт health-check. Возвращает IP-адрес клиента и строку User-Agent, что позволяет мониторингу или балансировщику убедиться, что экземпляр API отвечает.",
      },
      response: {
        200: t.Object(
          {
            ip: t.String({
              description: "IP-адрес клиента, как его видит сервер",
            }),
            userAgent: t.String({
              description: "Значение заголовка User-Agent из запроса",
            }),
          },
          { description: "Сервер доступен" },
        ),
      },
    },
  );

  app.get(
    "/rate",
    async () => {
      const r = await db.rateSetting.findFirst();
      return r
        ? { value: r.value, updatedAt: r.updatedAt.toISOString() }
        : { value: 0, updatedAt: new Date(0).toISOString() };
    },
    {
      tags: ["info"],
      response: {
        200: t.Object({ value: t.Number(), updatedAt: t.String() }),
      },
    },
  );

  app.get(
    "/topup-settings",
    async () => {
      let settings = await db.topupSettings.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });

      // Если настроек нет, возвращаем дефолтные
      if (!settings) {
        return {
          walletAddress: "TAfYiMZzP5XR1T6qCy3oXNkU4sfmAbC9qw",
          network: "TRC-20",
          minAmount: 10,
          confirmations: 1,
          isActive: true,
        };
      }

      return {
        walletAddress: settings.walletAddress,
        network: settings.network,
        minAmount: settings.minAmount,
        confirmations: settings.confirmations,
        isActive: settings.isActive,
      };
    },
    {
      tags: ["info"],
      detail: { summary: "Получить настройки пополнения для пользователей" },
      response: {
        200: t.Object({
          walletAddress: t.String(),
          network: t.String(),
          minAmount: t.Number(),
          confirmations: t.Number(),
          isActive: t.Boolean(),
        }),
      },
    },
  );

  return app;
};
