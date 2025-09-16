import { Elysia, t } from "elysia";
import { db } from "@/db";
import { serviceRegistry } from "@/services/ServiceRegistry";

export const telegramSettingsRoutes = new Elysia({ prefix: "/telegram-settings" })
  // Get telegram settings
  .get("/", async () => {
    try {
      // Get settings from database or environment
      let settings = await db.systemConfig.findUnique({
        where: { key: "telegram_settings" }
      });

      if (!settings) {
        // Return default settings from environment
        return {
          botLink: process.env.TELEGRAM_BOT_LINK || "",
          botUsername: process.env.TELEGRAM_BOT_USERNAME || "",
          botToken: process.env.TELEGRAM_BOT_TOKEN ? "••••••••" : ""
        };
      }

      const data = JSON.parse(settings.value);
      return {
        botLink: data.botLink || "",
        botUsername: data.botUsername || "",
        botToken: data.botToken ? "••••••••" : ""
      };
    } catch (error) {
      console.error("Failed to get telegram settings:", error);
      throw new Error("Failed to get telegram settings");
    }
  })

  // Update telegram settings
  .put("/", async ({ body, request }) => {
    try {
      const { botLink, botUsername, botToken } = body;
      
      // Validate fields
      if (botLink && !botLink.startsWith("https://")) {
        throw new Error("Bot link must start with https://");
      }
      
      if (botLink && !botLink.includes("/bot")) {
        throw new Error("Bot link must contain /bot");
      }

      if (botUsername && !/^[a-zA-Z0-9_]{5,32}$/.test(botUsername)) {
        throw new Error("Bot username must be 5-32 characters, only letters, numbers and underscore");
      }

      // Check if token is being changed
      const existingSettings = await db.systemConfig.findUnique({
        where: { key: "telegram_settings" }
      });

      let tokenChanged = false;
      let actualToken = botToken;

      if (existingSettings) {
        const existingData = JSON.parse(existingSettings.value);
        if (botToken !== "••••••••" && botToken !== existingData.botToken) {
          tokenChanged = true;
        } else if (botToken === "••••••••") {
          // Keep existing token
          actualToken = existingData.botToken;
        }
      } else if (botToken && botToken !== "••••••••") {
        tokenChanged = true;
      }

      // Validate token format if it's being changed
      if (tokenChanged && actualToken && !/^\d{10}:[A-Za-z0-9_-]{35}$/.test(actualToken)) {
        throw new Error("Invalid bot token format");
      }

      // Save settings
      const settingsData = {
        botLink,
        botUsername,
        botToken: actualToken
      };

      await db.systemConfig.upsert({
        where: { key: "telegram_settings" },
        update: { value: JSON.stringify(settingsData) },
        create: { 
          key: "telegram_settings", 
          value: JSON.stringify(settingsData),
          description: "Telegram bot settings"
        }
      });

      // Log the change
      // Extract admin info from request
      const adminKey = request.headers.get('x-admin-key') || 'unknown';
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      
      await db.adminLog.create({
        data: {
          adminId: adminKey,
          action: "UPDATE_TELEGRAM_SETTINGS",
          details: JSON.stringify({
            botLink,
            botUsername,
            tokenChanged
          }),
          ip: ip as string
        }
      });

      // Restart telegram service if token changed
      if (tokenChanged) {
        const telegramService = serviceRegistry.getService("TelegramService");
        if (telegramService) {
          await serviceRegistry.restartService("TelegramService");
        }
      }

      return { 
        success: true,
        tokenChanged,
        message: tokenChanged ? "Settings saved and service restarted" : "Settings saved"
      };
    } catch (error: any) {
      console.error("Failed to update telegram settings:", error);
      throw new Error(error.message || "Failed to update telegram settings");
    }
  }, {
    body: t.Object({
      botLink: t.String(),
      botUsername: t.String(),
      botToken: t.String()
    })
  })

  // Restart telegram service
  .post("/restart-service", async ({ request }) => {
    try {
      const telegramService = serviceRegistry.getService("TelegramService");
      if (!telegramService) {
        throw new Error("Telegram service not found");
      }

      await serviceRegistry.restartService("TelegramService");

      // Log the action
      // Extract admin info from request
      const adminKey = request.headers.get('x-admin-key') || 'unknown';
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      
      await db.adminLog.create({
        data: {
          adminId: adminKey,
          action: "RESTART_TELEGRAM_SERVICE",
          details: JSON.stringify({ manual: true }),
          ip: ip as string
        }
      });

      return { success: true, message: "Telegram service restarted" };
    } catch (error) {
      console.error("Failed to restart telegram service:", error);
      throw new Error("Failed to restart telegram service");
    }
  });