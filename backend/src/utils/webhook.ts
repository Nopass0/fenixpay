import crypto from "crypto";
import { db } from "@/db";

export async function sendWebhook(url: string, data: any): Promise<void> {
  try {
    // Get webhook secret
    const webhookSecret = await db.systemConfig.findUnique({
      where: { key: "withdrawal_webhook_secret" }
    });

    const payload = JSON.stringify(data);
    
    // Create signature if secret exists
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (webhookSecret?.value) {
      const signature = crypto
        .createHmac("sha256", webhookSecret.value)
        .update(payload)
        .digest("hex");
      headers["X-Webhook-Signature"] = signature;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payload,
    });

    if (!response.ok) {
      console.error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error sending webhook:", error);
  }
}