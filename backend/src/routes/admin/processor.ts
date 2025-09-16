import { Elysia, t } from "elysia";
import { db } from "@/db";
import { ProcessorConfigSchema } from "@/types/processor";

export default new Elysia()
  .get(
    "/notification-processor/config",
    async () => {
      const config = await db.serviceConfig.findUnique({
        where: { serviceKey: "notification_auto_processor" },
      });

      if (!config) {
        return {
          enabled: true,
          config: ProcessorConfigSchema.parse({}),
        };
      }

      return {
        enabled: config.isEnabled,
        config: config.config,
      };
    },
    {
      tags: ["admin"],
      detail: { summary: "Get notification processor configuration" },
      response: {
        200: t.Object({
          enabled: t.Boolean(),
          config: t.Any(),
        }),
      },
    }
  )
  .post(
    "/notification-processor/reload",
    async ({ body, serviceRegistry, error }) => {
      try {
        // Validate config
        const parsedConfig = ProcessorConfigSchema.parse(body);

        // Update in database
        await db.serviceConfig.upsert({
          where: { serviceKey: "notification_auto_processor" },
          create: {
            serviceKey: "notification_auto_processor",
            config: parsedConfig as any,
            isEnabled: parsedConfig.enabled,
          },
          update: {
            config: parsedConfig as any,
            isEnabled: parsedConfig.enabled,
          },
        });

        // Update service config
        const service = serviceRegistry.getService("NotificationAutoProcessorService");
        if (service) {
          await service.updatePublicFields({ config: parsedConfig });
        }

        return {
          success: true,
          message: "Notification processor configuration reloaded",
        };
      } catch (err) {
        return error(400, {
          error: "Invalid configuration",
          details: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
    {
      tags: ["admin"],
      detail: { summary: "Reload notification processor configuration" },
      body: t.Any(),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
        }),
        400: t.Object({
          error: t.String(),
          details: t.String(),
        }),
      },
    }
  )
  .get(
    "/notification-processor/stats",
    async ({ serviceRegistry }) => {
      const service = serviceRegistry.getService("NotificationAutoProcessorService");
      if (!service) {
        return {
          error: "Service not found",
        };
      }

      const publicFields = service.getPublicFields();
      return {
        stats: publicFields.stats,
        config: publicFields.config,
        supportedBanks: publicFields.supportedBanks,
        callbackQueueSize: publicFields.callbackQueueSize,
        activeCallbacks: publicFields.activeCallbacks,
      };
    },
    {
      tags: ["admin"],
      detail: { summary: "Get notification processor statistics" },
      response: {
        200: t.Object({
          stats: t.Any(),
          config: t.Any(),
          supportedBanks: t.Array(t.String()),
          callbackQueueSize: t.Number(),
          activeCallbacks: t.Number(),
        }),
      },
    }
  );