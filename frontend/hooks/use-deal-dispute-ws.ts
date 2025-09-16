"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

interface UseDealDisputeWSProps {
  disputeId: string;
  token: string;
  userType: "trader" | "merchant";
  onNewMessage?: (message: any) => void;
  onDisputeResolved?: (resolution: any) => void;
}

export function useDealDisputeWS({
  disputeId,
  token,
  userType,
  onNewMessage,
  onDisputeResolved,
}: UseDealDisputeWSProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000";
      wsRef.current = new WebSocket(`${wsUrl}/ws/deal-disputes`);

      wsRef.current.onopen = () => {
        console.log("Deal dispute WebSocket connected");
        isConnectedRef.current = true;

        // Authenticate
        wsRef.current?.send(
          JSON.stringify({
            type: "auth",
            token,
            role: userType,
          })
        );
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "auth":
              if (data.status === "success") {
                // Subscribe to dispute
                wsRef.current?.send(
                  JSON.stringify({
                    type: "subscribe",
                    disputeId,
                  })
                );
              } else {
                console.error("WebSocket auth failed:", data.message);
              }
              break;

            case "deal_dispute:reply":
              if (data.disputeId === disputeId && onNewMessage) {
                onNewMessage(data.message);
              }
              break;

            case "deal_dispute:resolved":
              if (data.disputeId === disputeId) {
                if (onDisputeResolved) {
                  onDisputeResolved(data.resolution);
                }
                toast.info("Спор был разрешен");
              }
              break;
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      wsRef.current.onclose = () => {
        console.log("Deal dispute WebSocket disconnected");
        isConnectedRef.current = false;

        // Reconnect after 3 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 3000);
        }
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
    }
  }, [disputeId, token, userType, onNewMessage, onDisputeResolved]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    isConnected: isConnectedRef.current,
    sendMessage,
  };
}