import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { db } from "@/db";

interface DealDisputeWsClient {
  id: string;
  merchantId?: string;
  traderId?: string;
  adminId?: string;
  send: (data: any) => void;
}

const clients = new Map<string, DealDisputeWsClient>();

export const dealDisputeWebSocketRoutes = new Elysia({ prefix: "/ws" })
  .use(
    jwt({
      name: "jwt",
      secret: Bun.env.JWT_SECRET!,
    })
  )
  .ws("/deal-disputes", {
    async open(ws) {
      console.log("Deal Dispute WebSocket client connected");
      
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
        const data = JSON.parse(message.toString());
        
        // Handle authentication
        if (data.type === "auth") {
          const { token, role } = data;
          
          if (role === "merchant") {
            // Verify merchant session token
            const session = await db.session.findFirst({
              where: { token },
              include: { user: true }
            });
            
            if (session) {
              const merchant = await db.merchant.findFirst({
                where: { id: session.userId }
              });
              
              if (merchant) {
                client.merchantId = merchant.id;
                ws.send(JSON.stringify({
                  type: "auth",
                  status: "success",
                  role: "merchant",
                }));
                return;
              }
            }
          } else if (role === "trader") {
            // Verify trader token
            const session = await db.session.findFirst({
              where: { token },
              include: { user: true }
            });
            
            if (session) {
              client.traderId = session.userId;
              ws.send(JSON.stringify({
                type: "auth",
                status: "success",
                role: "trader",
              }));
              return;
            }
          }
          
          ws.send(JSON.stringify({
            type: "auth",
            status: "failed",
            message: "Invalid token",
          }));
        }
        
        // Handle subscribe/unsubscribe to disputes
        if (data.type === "subscribe" && data.disputeId) {
          // Store subscription info
          (ws as any).disputeId = data.disputeId;
          ws.send(JSON.stringify({
            type: "subscribed",
            disputeId: data.disputeId,
          }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      }
    },
    
    close(ws) {
      const clientId = (ws as any).clientId;
      clients.delete(clientId);
      console.log("Deal Dispute WebSocket client disconnected");
    },
  });

// Helper functions to send events to specific clients
export const dealDisputeEvents = {
  // Send to all clients subscribed to a dispute
  sendToDispute(disputeId: string, event: any) {
    clients.forEach((client) => {
      // Check if client is subscribed to this dispute
      if ((client as any).disputeId === disputeId) {
        client.send(event);
      }
    });
  },
  
  // Send new dispute notification to trader
  notifyNewDispute(traderId: string, dispute: any) {
    clients.forEach((client) => {
      if (client.traderId === traderId) {
        client.send({
          type: "deal_dispute:new",
          dispute,
        });
      }
    });
  },
  
  // Send reply notification
  notifyReply(disputeId: string, message: any, senderType: string) {
    clients.forEach((client, clientId) => {
      const wsClient = clients.get(clientId);
      if (!wsClient) return;
      
      // Send to all participants in the dispute
      if ((wsClient as any).disputeId === disputeId) {
        client.send({
          type: "deal_dispute:reply",
          disputeId,
          message,
          senderType,
        });
      }
    });
  },
  
  // Send resolution notification
  notifyResolution(disputeId: string, resolution: any) {
    clients.forEach((client) => {
      if ((client as any).disputeId === disputeId) {
        client.send({
          type: "deal_dispute:resolved",
          disputeId,
          resolution,
        });
      }
    });
  },
};