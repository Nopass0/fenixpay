import { Payout } from "@prisma/client";

export class WebhookService {
  private static instance: WebhookService;

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  /**
   * Send webhook notification for payout status change
   */
  async sendPayoutStatusWebhook(payout: Payout, newStatus: string): Promise<void> {
    if (!payout.merchantWebhookUrl) {
      console.log(`[WebhookService] No webhook URL for payout ${payout.numericId}`);
      return;
    }

    const webhookData = {
      id: payout.numericId,
      status: newStatus,
      externalReference: payout.externalReference || null,
    };

    try {
      console.log(`[WebhookService] Sending webhook for payout ${payout.numericId} to ${payout.merchantWebhookUrl}`);
      
      const response = await fetch(payout.merchantWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        console.error(`[WebhookService] Webhook failed for payout ${payout.numericId}: ${response.status} ${response.statusText}`);
      } else {
        console.log(`[WebhookService] Webhook sent successfully for payout ${payout.numericId}`);
      }
    } catch (error) {
      console.error(`[WebhookService] Error sending webhook for payout ${payout.numericId}:`, error);
    }
  }
}

export const webhookService = WebhookService.getInstance();