import { BaseService } from "./BaseService";
import { db } from "../db";
import type { User, Payout } from "@prisma/client";
import { Elysia, t } from "elysia";

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: "HTML" | "Markdown";
  reply_markup?: any;
}

export class TelegramService extends BaseService {
  public autoStart = false; // Don't auto-start, will be started manually when needed
  private botTokens: Map<string, string> = new Map();
  
  async start(): Promise<void> {
    console.log("✅ Telegram Service started");
    await this.loadBotTokens();
  }
  
  async stop(): Promise<void> {
    console.log("❌ Telegram Service stopped");
  }
  
  /**
   * Load bot tokens from users who have them configured
   */
  private async loadBotTokens() {
    const users = await db.user.findMany({
      where: {
        telegramBotToken: { not: null },
      },
      select: {
        id: true,
        telegramBotToken: true,
      },
    });
    
    for (const user of users) {
      if (user.telegramBotToken) {
        this.botTokens.set(user.id, user.telegramBotToken);
      }
    }
    
    console.log(`📱 Loaded ${this.botTokens.size} Telegram bot tokens`);
  }
  
  /**
   * Send message via Telegram Bot API
   */
  private async sendTelegramMessage(
    botToken: string,
    message: TelegramMessage
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        }
      );
      
      if (!response.ok) {
        const error = await response.text();
        console.error("Telegram API error:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Failed to send Telegram message:", error);
      return false;
    }
  }
  
  /**
   * Notify trader about new payout
   */
  async notifyTraderNewPayout(
    traderId: string,
    payout: Payout & { merchant?: { name: string } }
  ) {
    const trader = await db.user.findUnique({
      where: { id: traderId },
      select: {
        telegramChatId: true,
        telegramBotToken: true,
      },
    });
    
    if (!trader?.telegramChatId || !trader?.telegramBotToken) {
      return;
    }
    
    const message: TelegramMessage = {
      chat_id: trader.telegramChatId,
      text: `🔔 <b>Новая выплата!</b>\n\n` +
        `💰 Сумма: ${payout.amount} RUB (${payout.amountUsdt} USDT)\n` +
        `📈 Курс: ${payout.rate}\n` +
        `🏦 Банк: ${payout.bank}\n` +
        `💳 На карту: ${payout.isCard ? "Да" : "Нет"}\n` +
        `🏪 Мерчант: ${payout.merchant?.name || "N/A"}\n` +
        `⏰ Время обработки: ${payout.processingTime} мин\n\n` +
        `ID выплаты: #${payout.numericId}`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Принять",
              callback_data: `accept_payout_${payout.id}`,
            },
            {
              text: "❌ Отклонить",
              callback_data: `reject_payout_${payout.id}`,
            },
          ],
        ],
      },
    };
    
    await this.sendTelegramMessage(trader.telegramBotToken, message);
  }
  
  /**
   * Notify trader about payout status change
   */
  async notifyTraderPayoutStatusChange(
    traderId: string,
    payout: Payout,
    newStatus: string
  ) {
    const trader = await db.user.findUnique({
      where: { id: traderId },
      select: {
        telegramChatId: true,
        telegramBotToken: true,
      },
    });
    
    if (!trader?.telegramChatId || !trader?.telegramBotToken) {
      return;
    }
    
    const statusEmoji: Record<string, string> = {
      ACTIVE: "✅",
      CHECKING: "🔍",
      COMPLETED: "💚",
      CANCELLED: "❌",
      DISPUTED: "⚠️",
      EXPIRED: "⏰",
    };
    
    const message: TelegramMessage = {
      chat_id: trader.telegramChatId,
      text: `${statusEmoji[newStatus] || "📌"} <b>Изменение статуса выплаты #${payout.numericId}</b>\n\n` +
        `Новый статус: <b>${this.getStatusText(newStatus)}</b>\n` +
        `Сумма: ${payout.amount} RUB`,
      parse_mode: "HTML",
    };
    
    await this.sendTelegramMessage(trader.telegramBotToken, message);
  }
  
  /**
   * Notify trader about dispute
   */
  async notifyTraderDispute(
    traderId: string,
    payout: Payout & { disputeMessage?: string | null }
  ) {
    const trader = await db.user.findUnique({
      where: { id: traderId },
      select: {
        telegramDisputeChatId: true,
        telegramChatId: true,
        telegramBotToken: true,
      },
    });
    
    if (!trader?.telegramBotToken) {
      return;
    }
    
    // Use dispute chat if configured, otherwise main chat
    const chatId = trader.telegramDisputeChatId || trader.telegramChatId;
    if (!chatId) {
      return;
    }
    
    const message: TelegramMessage = {
      chat_id: chatId,
      text: `⚠️ <b>СПОР по выплате #${payout.numericId}</b>\n\n` +
        `💰 Сумма: ${payout.amount} RUB\n` +
        `📝 Причина: ${payout.disputeMessage || "Не указана"}\n\n` +
        `Пожалуйста, свяжитесь с поддержкой для решения вопроса.`,
      parse_mode: "HTML",
    };
    
    await this.sendTelegramMessage(trader.telegramBotToken, message);
  }
  
  /**
   * Notify merchant about payout status
   */
  async notifyMerchantPayoutStatus(
    merchantId: string,
    payout: Payout,
    event: string
  ) {
    // Skip Telegram notifications for merchants as they don't have telegram fields
    return;
    
    const eventText: Record<string, string> = {
      ACTIVE: "принята трейдером",
      CHECKING: "на проверке",
      COMPLETED: "успешно завершена",
      CANCELLED: "отменена",
      DISPUTED: "оспорена",
    };
    
    const message: TelegramMessage = {
      chat_id: merchant.telegramChatId,
      text: `📊 <b>Выплата #${payout.numericId} ${eventText[event] || event}</b>\n\n` +
        `💰 Сумма: ${payout.amount} RUB\n` +
        `🏦 Банк: ${payout.bank}\n` +
        `📎 Ref: ${payout.externalReference || "—"}`,
      parse_mode: "HTML",
    };
    
    await this.sendTelegramMessage(merchant.telegramBotToken, message);
  }
  
  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      CREATED: "Создана",
      ACTIVE: "Активна",
      CHECKING: "На проверке",
      COMPLETED: "Завершена",
      CANCELLED: "Отменена",
      DISPUTED: "Спор",
      EXPIRED: "Истекла",
    };
    
    return statusMap[status] || status;
  }
  
  /**
   * Get API endpoints for Telegram integration
   */
  getApp(): Elysia {
    return new Elysia({ prefix: "/telegram" })
      .group("/link", (app) =>
        app
          // Link Telegram account
          .post(
            "/",
            async ({ body, set }) => {
              try {
                const { userId, telegramChatId, telegramBotToken } = body;
                
                // Verify bot token by making a test API call
                const response = await fetch(
                  `https://api.telegram.org/bot${telegramBotToken}/getMe`
                );
                
                if (!response.ok) {
                  set.status = 400;
                  return { error: "Invalid bot token" };
                }
                
                // Update user
                await db.user.update({
                  where: { id: userId },
                  data: {
                    telegramChatId,
                    telegramBotToken,
                  },
                });
                
                // Reload bot tokens
                await this.loadBotTokens();
                
                // Send test message
                await this.sendTelegramMessage(telegramBotToken, {
                  chat_id: telegramChatId,
                  text: "✅ Telegram успешно подключен к системе выплат!",
                });
                
                return { success: true };
              } catch (error: any) {
                set.status = 500;
                return { error: error.message };
              }
            },
            {
              body: t.Object({
                userId: t.String(),
                telegramChatId: t.String(),
                telegramBotToken: t.String(),
              }),
            }
          )
          
          // Unlink Telegram account
          .delete(
            "/:userId",
            async ({ params, set }) => {
              try {
                await db.user.update({
                  where: { id: params.userId },
                  data: {
                    telegramChatId: null,
                    telegramBotToken: null,
                    telegramDisputeChatId: null,
                  },
                });
                
                // Remove from cache
                this.botTokens.delete(params.userId);
                
                return { success: true };
              } catch (error: any) {
                set.status = 500;
                return { error: error.message };
              }
            },
            {
              params: t.Object({
                userId: t.String(),
              }),
            }
          )
      )
      
      // Test notification endpoint
      .post(
        "/test",
        async ({ body, set }) => {
          try {
            const { userId, message } = body;
            
            const user = await db.user.findUnique({
              where: { id: userId },
              select: {
                telegramChatId: true,
                telegramBotToken: true,
              },
            });
            
            if (!user?.telegramChatId || !user?.telegramBotToken) {
              set.status = 400;
              return { error: "Telegram not configured for this user" };
            }
            
            const success = await this.sendTelegramMessage(
              user.telegramBotToken,
              {
                chat_id: user.telegramChatId,
                text: message,
                parse_mode: "HTML",
              }
            );
            
            return { success };
          } catch (error: any) {
            set.status = 500;
            return { error: error.message };
          }
        },
        {
          body: t.Object({
            userId: t.String(),
            message: t.String(),
          }),
        }
      );
  }
  
  getEndpoints(): string[] {
    return ["/telegram/link", "/telegram/test"];
  }
}

export default TelegramService;