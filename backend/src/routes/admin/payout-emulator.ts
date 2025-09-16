import { Elysia, t } from "elysia";
import { ServiceRegistry } from "../../services/ServiceRegistry";
import PayoutEmulatorService from "../../services/PayoutEmulatorService";

const ErrorSchema = t.Object({
  error: t.String(),
});

const authHeader = t.Object({
  "x-admin-key": t.String(),
});

export default new Elysia({ prefix: "/payout-emulator" })
  
  /* ───────────────── Get emulator stats ───────────────── */
  .get(
    "/stats",
    async ({ error }) => {
      try {
        const service = ServiceRegistry.get("payout_emulator") as PayoutEmulatorService;
        if (!service) {
          return error(404, { error: "Сервис эмулятора выплат не найден" });
        }

        const stats = await service.getStats();
        return { success: true, stats };
      } catch (e) {
        return error(500, { error: "Ошибка получения статистики" });
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      response: {
        200: t.Object({
          success: t.Boolean(),
          stats: t.Object({
            createdPayouts: t.Number(),
            failedPayouts: t.Number(),
            isRunning: t.Boolean(),
            merchantToken: t.String(),
            interval: t.Number(),
          }),
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
    }
  )

  /* ───────────────── Start emulator ───────────────── */
  .post(
    "/start",
    async ({ error }) => {
      try {
        const service = ServiceRegistry.get("payout_emulator") as PayoutEmulatorService;
        if (!service) {
          return error(404, { error: "Сервис эмулятора выплат не найден" });
        }

        await service.start();
        return { success: true, message: "Эмулятор выплат запущен" };
      } catch (e) {
        return error(500, { error: "Ошибка запуска эмулятора" });
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
    }
  )

  /* ───────────────── Stop emulator ───────────────── */
  .post(
    "/stop",
    async ({ error }) => {
      try {
        const service = ServiceRegistry.get("payout_emulator") as PayoutEmulatorService;
        if (!service) {
          return error(404, { error: "Сервис эмулятора выплат не найден" });
        }

        await service.stop();
        return { success: true, message: "Эмулятор выплат остановлен" };
      } catch (e) {
        return error(500, { error: "Ошибка остановки эмулятора" });
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
    }
  )

  /* ───────────────── Reset stats ───────────────── */
  .post(
    "/reset-stats",
    async ({ error }) => {
      try {
        const service = ServiceRegistry.get("payout_emulator") as PayoutEmulatorService;
        if (!service) {
          return error(404, { error: "Сервис эмулятора выплат не найден" });
        }

        await service.resetStats();
        return { success: true, message: "Статистика сброшена" };
      } catch (e) {
        return error(500, { error: "Ошибка сброса статистики" });
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
    }
  )

  /* ───────────────── Update merchant token ───────────────── */
  .patch(
    "/merchant-token",
    async ({ body, error }) => {
      try {
        const service = ServiceRegistry.get("payout_emulator") as PayoutEmulatorService;
        if (!service) {
          return error(404, { error: "Сервис эмулятора выплат не найден" });
        }

        await service.updateMerchantToken(body.token);
        return { success: true, message: "Токен мерчанта обновлен" };
      } catch (e) {
        return error(500, { error: "Ошибка обновления токена" });
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      body: t.Object({
        token: t.String({ minLength: 1 }),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
    }
  )

  /* ───────────────── Update interval ───────────────── */
  .patch(
    "/interval",
    async ({ body, error }) => {
      try {
        const service = ServiceRegistry.get("payout_emulator") as PayoutEmulatorService;
        if (!service) {
          return error(404, { error: "Сервис эмулятора выплат не найден" });
        }

        await service.updateInterval(body.interval);
        return { success: true, message: "Интервал обновлен" };
      } catch (e) {
        return error(500, { error: "Ошибка обновления интервала" });
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      body: t.Object({
        interval: t.Number({ minimum: 1000 }),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
        }),
        404: ErrorSchema,
        500: ErrorSchema,
      },
    }
  );