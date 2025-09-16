import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { db } from "@/db";

interface PayoutWsClient {
  id: string;
  merchantId?: string;
  traderId?: string;
  adminId?: string;
  send: (data: any) => void;
}

const clients = new Map<string, PayoutWsClient>();

export const payoutWebSocketRoutes = new Elysia({ prefix: "/ws" })
  .use(
    jwt({
      name: "jwt",
      secret: Bun.env.JWT_SECRET!,
    })
  )
  .ws("/payouts", {
    async open(ws) {
      console.log("WebSocket client connected");
      
      // Client will authenticate after connection
      const clientId = crypto.randomUUID();
      clients.set(clientId, {
        id: clientId,
        send: (data) => ws.send(JSON.stringify(data)),
      });
      
      // Store client ID for later
      (ws as any).clientId = clientId;
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: "connection",
        status: "connected",
        message: "Please authenticate",
      }));
    },
    
    async message(ws, message) {
      const clientId = (ws as any).clientId;
      const client = clients.get(clientId);
      
      if (!client) {
        ws.send(JSON.stringify({ type: "error", message: "Client not found" }));
        return;
      }
      
      try {
        const data = typeof message === "string" ? JSON.parse(message) : message;
        
        switch (data.type) {
          case "auth":
            await handleAuth(ws, client, data);
            break;
            
          case "subscribe":
            await handleSubscribe(ws, client, data);
            break;
            
          case "unsubscribe":
            await handleUnsubscribe(ws, client, data);
            break;
            
          case "ping":
            ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            break;
            
          default:
            ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      }
    },
    
    close(ws) {
      const clientId = (ws as any).clientId;
      clients.delete(clientId);
      console.log("WebSocket client disconnected");
    },
  });

async function handleAuth(ws: any, client: PayoutWsClient, data: any) {
  const { token, type } = data;
  
  if (!token || !type) {
    ws.send(JSON.stringify({ type: "error", message: "Missing token or type" }));
    return;
  }
  
  try {
    switch (type) {
      case "merchant":
        const merchant = await db.merchant.findUnique({
          where: { token },
        });
        
        if (!merchant || merchant.disabled || merchant.banned) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid merchant token" }));
          ws.close();
          return;
        }
        
        client.merchantId = merchant.id;
        ws.send(JSON.stringify({ 
          type: "auth",
          status: "success",
          merchantId: merchant.id,
        }));
        break;
        
      case "trader":
        // For traders, we'd need to verify JWT token
        // This is simplified for now
        const traderId = data.traderId;
        if (!traderId) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid trader auth" }));
          ws.close();
          return;
        }
        
        client.traderId = traderId;
        ws.send(JSON.stringify({ 
          type: "auth",
          status: "success",
          traderId,
        }));
        break;
        
      case "admin":
        const adminKey = token;
        const admin = await db.admin.findUnique({
          where: { token: adminKey },
        });
        
        if (!admin) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid admin token" }));
          ws.close();
          return;
        }
        
        client.adminId = admin.id;
        ws.send(JSON.stringify({ 
          type: "auth",
          status: "success",
          adminId: admin.id,
        }));
        break;
        
      default:
        ws.send(JSON.stringify({ type: "error", message: "Invalid auth type" }));
        ws.close();
    }
  } catch (error) {
    console.error("Auth error:", error);
    ws.send(JSON.stringify({ type: "error", message: "Authentication failed" }));
    ws.close();
  }
}

async function handleSubscribe(ws: any, client: PayoutWsClient, data: any) {
  // Implement subscription logic based on client type
  if (!client.merchantId && !client.traderId && !client.adminId) {
    ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
    return;
  }
  
  ws.send(JSON.stringify({ 
    type: "subscribed",
    message: "Subscribed to payout updates",
  }));
}

async function handleUnsubscribe(ws: any, client: PayoutWsClient, data: any) {
  ws.send(JSON.stringify({ 
    type: "unsubscribed",
    message: "Unsubscribed from payout updates",
  }));
}

// Export function to broadcast payout updates
export function broadcastPayoutUpdate(
  payoutId: string,
  event: string,
  payout: any,
  targetMerchantId?: string,
  targetTraderId?: string
) {
  const message = {
    type: "payout_update",
    event,
    payout: {
      id: payout.id,
      numericId: payout.numericId,
      status: payout.status,
      amount: payout.amount,
      amountUsdt: payout.amountUsdt,
      rate: payout.rate,
      merchantRate: payout.merchantRate,
      rateDelta: payout.rateDelta,
      feePercent: payout.feePercent,
      wallet: payout.wallet,
      bank: payout.bank,
      isCard: payout.isCard,
      direction: payout.direction,
      externalReference: payout.externalReference,
      proofFiles: payout.proofFiles,
      disputeFiles: payout.disputeFiles,
      disputeMessage: payout.disputeMessage,
      cancelReason: payout.cancelReason,
      cancelReasonCode: payout.cancelReasonCode,
      createdAt: payout.createdAt,
      acceptedAt: payout.acceptedAt,
      confirmedAt: payout.confirmedAt,
      cancelledAt: payout.cancelledAt,
      expireAt: payout.expireAt,
    },
    timestamp: new Date().toISOString(),
  };
  
  // Broadcast to relevant clients
  for (const [clientId, client] of clients) {
    // Send to merchants
    if (client.merchantId && targetMerchantId && client.merchantId === targetMerchantId) {
      client.send(message);
    }
    
    // Send to traders
    if (client.traderId && targetTraderId && client.traderId === targetTraderId) {
      client.send(message);
    }
    
    // Send to all admins
    if (client.adminId) {
      client.send(message);
    }
  }
}

// Export function to broadcast rate adjustments
export function broadcastRateAdjustment(
  payoutId: string,
  oldRateDelta: number,
  newRateDelta: number,
  oldFeePercent: number,
  newFeePercent: number,
  adminId: string
) {
  const message = {
    type: "rate_adjustment",
    payoutId,
    oldRateDelta,
    newRateDelta,
    oldFeePercent,
    newFeePercent,
    adminId,
    timestamp: new Date().toISOString(),
  };
  
  // Broadcast to all authenticated clients
  for (const [clientId, client] of clients) {
    if (client.merchantId || client.traderId || client.adminId) {
      client.send(message);
    }
  }
}

export default payoutWebSocketRoutes;