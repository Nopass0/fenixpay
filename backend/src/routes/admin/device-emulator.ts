import { Elysia, t } from "elysia"
import { db } from "@/db"
import { serviceRegistry } from "@/services/ServiceRegistry"
import { EmulatorConfigSchema } from "@/types/device-emulator"

export default (app: Elysia) =>
  app
    // Get current config
    .get(
      "/device-emulator/config",
      async () => {
        const serviceConfig = await db.serviceConfig.findUnique({
          where: { serviceKey: "device_emulator" }
        })
        
        const service = serviceRegistry.getService("DeviceEmulatorService")
        const metrics = service?.getPublicFields() || {}
        
        return {
          config: serviceConfig?.config || {
            global: {
              defaultPingSec: 60,
              defaultNotifyChance: 0.4,
              defaultSpamChance: 0.05,
              defaultDelayChance: 0.1,
              reconnectOnAuthError: true,
            },
            devices: [],
          },
          enabled: serviceConfig?.isEnabled || false,
          metrics: {
            deviceCount: metrics.deviceCount || 0,
            activeDevices: metrics.activeDevices || 0,
            devices: metrics.devices || [],
            isRunning: metrics.isRunning || false,
          }
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Get Device Emulator Service configuration" },
        response: {
          200: t.Object({
            config: t.Any(),
            enabled: t.Boolean(),
            metrics: t.Object({
              deviceCount: t.Number(),
              activeDevices: t.Number(),
              devices: t.Array(t.Any()),
              isRunning: t.Boolean(),
            })
          })
        }
      }
    )
    
    // Update config
    .post(
      "/device-emulator/config",
      async ({ body, error }) => {
        try {
          // Validate config
          const validatedConfig = EmulatorConfigSchema.parse(body)
          
          // Save to database
          await db.serviceConfig.upsert({
            where: { serviceKey: "device_emulator" },
            create: {
              serviceKey: "device_emulator",
              config: validatedConfig,
              isEnabled: true,
            },
            update: {
              config: validatedConfig,
            }
          })
          
          // Reload service if running
          const service = serviceRegistry.getService("DeviceEmulatorService")
          if (service && 'reload' in service) {
            await (service as any).reload(validatedConfig)
          }
          
          return { success: true, message: "Configuration updated successfully" }
        } catch (err: any) {
          return error(400, { error: err.message || "Invalid configuration" })
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Update Device Emulator Service configuration" },
        body: t.Any(),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
          }),
          400: t.Object({
            error: t.String(),
          })
        }
      }
    )
    
    // Enable/disable service
    .patch(
      "/device-emulator/enabled",
      async ({ body }) => {
        await db.serviceConfig.upsert({
          where: { serviceKey: "device_emulator" },
          create: {
            serviceKey: "device_emulator",
            config: {
              global: {
                defaultPingSec: 60,
                defaultNotifyChance: 0.4,
                defaultSpamChance: 0.05,
                defaultDelayChance: 0.1,
                reconnectOnAuthError: true,
              },
              devices: [],
            },
            isEnabled: body.enabled,
          },
          update: {
            isEnabled: body.enabled,
          }
        })
        
        // Start or stop service
        const service = serviceRegistry.getService("DeviceEmulatorService")
        if (service) {
          if (body.enabled && process.env.DES_ENABLED === 'true') {
            await serviceRegistry.startService("DeviceEmulatorService")
          } else {
            await serviceRegistry.stopService("DeviceEmulatorService")
          }
        }
        
        return { success: true, enabled: body.enabled }
      },
      {
        tags: ["admin"],
        detail: { summary: "Enable or disable Device Emulator Service" },
        body: t.Object({
          enabled: t.Boolean(),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            enabled: t.Boolean(),
          })
        }
      }
    )