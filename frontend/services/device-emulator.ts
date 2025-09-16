import { EventEmitter } from 'events';

interface DeviceEmulatorConfig {
  deviceToken: string;
  wsUrl?: string;
  pingInterval?: number;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export class DeviceEmulator extends EventEmitter {
  private ws: WebSocket | null = null;
  private deviceToken: string;
  private wsUrl: string;
  private pingInterval: number;
  private reconnectDelay: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts = 0;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private shouldReconnect = true;

  constructor(config: DeviceEmulatorConfig) {
    super();
    this.deviceToken = config.deviceToken;
    
    // Construct WebSocket URL for device-ping endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const wsBase = apiUrl.replace('https:', 'wss:').replace('http:', 'ws:');
    this.wsUrl = config.wsUrl || `${wsBase}/ws/device-ping`;
    
    this.pingInterval = config.pingInterval || 2000; // 2 seconds default
    this.reconnectDelay = config.reconnectDelay || 3000; // 3 seconds default
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;

    console.log('[DeviceEmulator] Initialized with config:', {
      wsUrl: this.wsUrl,
      pingInterval: this.pingInterval,
      reconnectDelay: this.reconnectDelay
    });
  }

  connect() {
    if (this.isConnected || this.ws?.readyState === WebSocket.OPEN) {
      console.log('[DeviceEmulator] Already connected');
      return;
    }

    console.log('[DeviceEmulator] Connecting to:', this.wsUrl);
    
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('[DeviceEmulator] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Start sending pings immediately
        this.startPinging();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[DeviceEmulator] Received:', data);
          
          if (data.type === 'pong') {
            this.emit('pong', data);
          } else if (data.type === 'error') {
            console.error('[DeviceEmulator] Server error:', data.message);
            this.emit('error', data.message);
          }
        } catch (error) {
          console.error('[DeviceEmulator] Error parsing message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('[DeviceEmulator] WebSocket error:', error);
        this.emit('error', error);
      };
      
      this.ws.onclose = (event) => {
        console.log('[DeviceEmulator] Disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.stopPinging();
        this.emit('disconnected');
        
        // Schedule reconnect if needed
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };
      
    } catch (error) {
      console.error('[DeviceEmulator] Connection error:', error);
      this.emit('error', error);
      this.scheduleReconnect();
    }
  }

  private startPinging() {
    this.stopPinging(); // Clear any existing timer
    
    // Send first ping immediately
    this.sendPing();
    
    // Schedule regular pings
    this.pingTimer = setInterval(() => {
      this.sendPing();
    }, this.pingInterval);
  }

  private stopPinging() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private sendPing() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const pingData = {
        type: 'ping',
        deviceToken: this.deviceToken,
        batteryLevel: 85, // You can make this dynamic
        networkSpeed: 100, // You can make this dynamic
        timestamp: new Date().toISOString()
      };
      
      console.log('[DeviceEmulator] Sending ping');
      this.ws.send(JSON.stringify(pingData));
      this.emit('ping', pingData);
    } else {
      console.warn('[DeviceEmulator] Cannot send ping - not connected');
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000);

    console.log(`[DeviceEmulator] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  disconnect() {
    console.log('[DeviceEmulator] Disconnecting...');
    this.shouldReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopPinging();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  isConnectedStatus() {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  // Update battery and network info
  updateStatus(batteryLevel?: number, networkSpeed?: number) {
    // This would be used to update dynamic values
    // For now, we're using static values in sendPing
  }
}

// Factory function to create emulator instance
export function createDeviceEmulator(deviceToken: string): DeviceEmulator {
  return new DeviceEmulator({ deviceToken });
}