import { BaseService } from "./BaseService";
import { db } from "@/db";
import { MessageType, MessagePriority } from "@prisma/client";
import webpush from "web-push";

export class PushNotificationService extends BaseService {
  private telegramBotToken: string | null = null;
  public readonly autoStart = true;
  
  constructor() {
    super();
    this.interval = 60000; // 1 minute
  }
  
  protected async onStart(): Promise<void> {
    await this.logInfo("Push Notification Service starting");
    
    // Initialize web push with VAPID keys if available
    if (Bun.env.VAPID_PUBLIC_KEY && Bun.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        Bun.env.VAPID_CONTACT || "mailto:admin@chase.com",
        Bun.env.VAPID_PUBLIC_KEY,
        Bun.env.VAPID_PRIVATE_KEY
      );
    }
    
    this.telegramBotToken = Bun.env.TELEGRAM_BOT_TOKEN || null;
    
    await this.logInfo("Push Notification Service started");
  }

  protected async onStop(): Promise<void> {
    await this.logInfo("Push Notification Service stopped");
  }
  
  protected async tick(): Promise<void> {
    // This service doesn't need periodic ticks
    // It only sends notifications on demand
  }

  async sendNotification(
    traderId: string,
    subject: string,
    content: string,
    options: {
      type?: MessageType;
      priority?: MessagePriority;
      relatedEntityId?: string;
      relatedEntity?: string;
      attachments?: Array<{ filename: string; url: string; size: number; mimeType: string }>;
    } = {}
  ): Promise<void> {
    try {
      // Create message in database
      const message = await db.message.create({
        data: {
          traderId,
          subject,
          content,
          type: options.type || MessageType.SYSTEM,
          priority: options.priority || MessagePriority.NORMAL,
          relatedEntityId: options.relatedEntityId,
          relatedEntity: options.relatedEntity,
          attachments: options.attachments ? {
            create: options.attachments
          } : undefined
        },
        include: {
          trader: true
        }
      });

      // Send push notifications to all methods in parallel
      const notificationPromises: Promise<void>[] = [];

      // Send Telegram notification
      if (message.trader.telegramChatId && this.telegramBotToken) {
        notificationPromises.push(this.sendTelegramNotification(
          message.trader.telegramChatId,
          subject,
          content,
          options.priority
        ));
      }

      // Send email notification
      if (message.trader.email) {
        notificationPromises.push(this.sendEmailNotification(
          message.trader.email,
          subject,
          content
        ));
      }

      // Send web push to all devices
      const devices = await db.device.findMany({
        where: {
          userId: traderId,
          pushEnabled: true,
          webPushEndpoint: { not: null }
        }
      });

      for (const device of devices) {
        if (device.webPushEndpoint && device.webPushP256dh && device.webPushAuth) {
          notificationPromises.push(this.sendWebPushNotification(
            device,
            subject,
            content
          ));
        }
      }

      // Wait for all notifications to complete
      await Promise.allSettled(notificationPromises);
      
      await this.logInfo(`Notifications sent for message ${message.id}`);
    } catch (error) {
      await this.logError("Error sending notification", { error });
    }
  }

  private async sendTelegramNotification(
    chatId: string,
    subject: string,
    content: string,
    priority?: MessagePriority
  ): Promise<void> {
    if (!this.telegramBotToken) return;

    try {
      const priorityEmoji = priority === MessagePriority.URGENT ? "🚨 " :
                           priority === MessagePriority.HIGH ? "⚠️ " : "";
      
      const text = `${priorityEmoji}*${this.escapeMarkdown(subject)}*\n\n${this.escapeMarkdown(content)}`;
      
      const response = await fetch(`https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "MarkdownV2"
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${error}`);
      }
    } catch (error) {
      await this.logError("Error sending Telegram notification", { error, chatId });
    }
  }

  private async sendEmailNotification(
    email: string,
    subject: string,
    content: string
  ): Promise<void> {
    // Email implementation would go here
    // For now, just log
    await this.logDebug("Email notification would be sent", { email, subject });
  }

  private async sendWebPushNotification(
    device: any,
    subject: string,
    content: string
  ): Promise<void> {
    try {
      const pushSubscription = {
        endpoint: device.webPushEndpoint,
        keys: {
          p256dh: device.webPushP256dh,
          auth: device.webPushAuth
        }
      };

      const payload = JSON.stringify({
        title: subject,
        body: content,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        timestamp: Date.now()
      });

      await webpush.sendNotification(pushSubscription, payload);
      
      await this.logDebug("Web push sent", { deviceId: device.id });
    } catch (error) {
      await this.logError("Error sending web push", { error, deviceId: device.id });
      
      // If push failed due to invalid subscription, disable push for this device
      if (error.statusCode === 410) {
        await db.device.update({
          where: { id: device.id },
          data: { pushEnabled: false }
        });
      }
    }
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  }

  // Helper method to send notifications for specific events
  async notifyTransactionUpdate(traderId: string, transactionId: string, status: string): Promise<void> {
    await this.sendNotification(
      traderId,
      `Обновление транзакции #${transactionId}`,
      `Статус вашей транзакции изменен на: ${status}`,
      {
        type: MessageType.TRANSACTION,
        relatedEntityId: transactionId,
        relatedEntity: "transaction"
      }
    );
  }

  async notifyPayoutUpdate(traderId: string, payoutId: string, status: string): Promise<void> {
    await this.sendNotification(
      traderId,
      `Обновление выплаты #${payoutId}`,
      `Статус вашей выплаты изменен на: ${status}`,
      {
        type: MessageType.PAYOUT,
        relatedEntityId: payoutId,
        relatedEntity: "payout"
      }
    );
  }

  async notifyDepositConfirmed(traderId: string, amount: number, txHash: string): Promise<void> {
    await this.sendNotification(
      traderId,
      "Депозит зачислен",
      `Ваш депозит на сумму ${amount} USDT успешно зачислен. TxHash: ${txHash}`,
      {
        type: MessageType.DEPOSIT,
        priority: MessagePriority.HIGH
      }
    );
  }

  async notifyWithdrawalUpdate(traderId: string, withdrawalId: string, status: string, reason?: string): Promise<void> {
    let content = `Статус вашей заявки на вывод изменен на: ${status}`;
    if (reason) {
      content += `\nПричина: ${reason}`;
    }
    
    await this.sendNotification(
      traderId,
      `Обновление вывода средств`,
      content,
      {
        type: MessageType.WITHDRAWAL,
        relatedEntityId: withdrawalId,
        relatedEntity: "withdrawal",
        priority: status === "REJECTED" ? MessagePriority.HIGH : MessagePriority.NORMAL
      }
    );
  }

  async notifySecurityAlert(traderId: string, alert: string): Promise<void> {
    await this.sendNotification(
      traderId,
      "Предупреждение безопасности",
      alert,
      {
        type: MessageType.SECURITY,
        priority: MessagePriority.URGENT
      }
    );
  }
}