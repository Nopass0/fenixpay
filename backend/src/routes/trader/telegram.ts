import { Elysia, t } from "elysia";
import { db as prisma } from "@/db";
import { traderGuard } from "@/middleware/traderGuard";
import { generateRandomCode } from "@/utils/code-generator";

export default new Elysia({ prefix: "/telegram" })
  .use(traderGuard())
  
  // Generate a new telegram link code
  .post("/generate-link-code", async ({ user }) => {
    try {
      // Check if user already has an active code
      const existingCode = await prisma.telegramLink.findFirst({
        where: {
          userId: user.id,
          isLinked: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      // If exists and still valid, return it
      if (existingCode) {
        return {
          success: true,
          linkCode: existingCode.code
        };
      }

      // Generate new unique code
      let code: string;
      let isUnique = false;
      
      while (!isUnique) {
        code = generateRandomCode(8); // 8-character alphanumeric code
        const existing = await prisma.telegramLink.findUnique({
          where: { code }
        });
        if (!existing) {
          isUnique = true;
        }
      }

      // Create new link code with 24 hour expiry
      const linkCode = await prisma.telegramLink.create({
        data: {
          code: code!,
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      return {
        success: true,
        linkCode: linkCode.code
      };
    } catch (error) {
      console.error("Failed to generate telegram link code:", error);
      throw new Error("Failed to generate link code");
    }
  })
  
  // Check if telegram is connected
  .get("/check-connection", async ({ user }) => {
    try {
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          telegramChatId: true
        }
      });

      // Get the linked telegram connection if exists
      const telegramLink = await prisma.telegramLink.findFirst({
        where: {
          userId: user.id,
          isLinked: true
        },
        orderBy: {
          linkedAt: 'desc'
        }
      });

      return {
        success: true,
        connected: !!userData?.telegramChatId,
        connectedAt: telegramLink?.linkedAt
      };
    } catch (error) {
      console.error("Failed to check telegram connection:", error);
      throw new Error("Failed to check connection");
    }
  })
  
  // Disconnect telegram
  .post("/disconnect", async ({ user }) => {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramChatId: null
        }
      });

      // Mark all unused codes as linked
      await prisma.telegramLink.updateMany({
        where: {
          userId: user.id,
          isLinked: false
        },
        data: {
          isLinked: true
        }
      });

      return {
        success: true,
        message: "Telegram отключен успешно"
      };
    } catch (error) {
      console.error("Failed to disconnect telegram:", error);
      throw new Error("Failed to disconnect telegram");
    }
  })
  
  // Verify telegram link code (called by the bot)
  .post("/verify-link-code", async ({ body }) => {
    try {
      const { code, chatId } = body;

      // Find the link code
      const linkCode = await prisma.telegramLink.findUnique({
        where: { code }
      });

      if (!linkCode) {
        return {
          success: false,
          error: "Invalid code"
        };
      }

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: linkCode.userId }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found"
        };
      }

      if (linkCode.isLinked) {
        return {
          success: false,
          error: "Code already used"
        };
      }

      if (linkCode.expiresAt < new Date()) {
        return {
          success: false,
          error: "Code expired"
        };
      }

      // Update user with telegram chat ID
      await prisma.user.update({
        where: { id: linkCode.userId },
        data: {
          telegramChatId: chatId.toString()
        }
      });

      // Mark code as linked
      await prisma.telegramLink.update({
        where: { id: linkCode.id },
        data: {
          isLinked: true,
          linkedAt: new Date(),
          chatId: chatId.toString()
        }
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      };
    } catch (error) {
      console.error("Failed to verify telegram link code:", error);
      return {
        success: false,
        error: "Failed to verify code"
      };
    }
  }, {
    body: t.Object({
      code: t.String(),
      chatId: t.Union([t.String(), t.Number()])
    })
  });