"use client";

import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { deviceWSManager } from '@/services/device-ws-manager';

interface WebSocketContextType {
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
});

export function useWebSocket() {
  return useContext(WebSocketContext);
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Initialize WebSocket connection
    console.log('[WebSocketProvider] Initializing WebSocket connection');
    
    try {
      deviceWSManager.connect();
    } catch (error) {
      console.error('[WebSocketProvider] Failed to connect WebSocket:', error);
    }

    // Cleanup on unmount
    return () => {
      console.log('[WebSocketProvider] Cleaning up WebSocket connection');
      deviceWSManager.disconnect();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected: deviceWSManager.isConnected() }}>
      {children}
    </WebSocketContext.Provider>
  );
}