import { getDeviceStatusWebSocket, DeviceStatusUpdate } from './device-status-ws';

class DeviceWebSocketManager {
  private static instance: DeviceWebSocketManager;
  private ws: ReturnType<typeof getDeviceStatusWebSocket> | null = null;
  private subscribedDevices: Set<string> = new Set();
  private listeners: Map<string, Set<Function>> = new Map();

  private constructor() {}

  static getInstance(): DeviceWebSocketManager {
    if (!DeviceWebSocketManager.instance) {
      DeviceWebSocketManager.instance = new DeviceWebSocketManager();
    }
    return DeviceWebSocketManager.instance;
  }

  connect() {
    if (!this.ws) {
      console.log('[DeviceWSManager] Creating new WebSocket connection');
      this.ws = getDeviceStatusWebSocket();
      this.ws.connect();

      // Setup global listeners
      this.ws.on('device-status-update', (update: DeviceStatusUpdate) => {
        this.notifyListeners('device-status-update', update);
      });

      this.ws.on('device-offline', (deviceId: string) => {
        this.notifyListeners('device-offline', deviceId);
      });

      this.ws.on('bank-details-disabled', (data: any) => {
        this.notifyListeners('bank-details-disabled', data);
      });

      this.ws.on('bank-details-enabled', (data: any) => {
        this.notifyListeners('bank-details-enabled', data);
      });
    }
    return this.ws;
  }

  subscribeToDevice(deviceId: string) {
    if (!this.subscribedDevices.has(deviceId)) {
      console.log('[DeviceWSManager] Subscribing to device:', deviceId);
      this.subscribedDevices.add(deviceId);
      this.ws?.subscribeToDevice(deviceId);
    }
  }

  unsubscribeFromDevice(deviceId: string) {
    if (this.subscribedDevices.has(deviceId)) {
      console.log('[DeviceWSManager] Unsubscribing from device:', deviceId);
      this.subscribedDevices.delete(deviceId);
      this.ws?.unsubscribeFromDevice(deviceId);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private notifyListeners(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  isConnected(): boolean {
    return this.ws?.isConnectedStatus() || false;
  }

  disconnect() {
    if (this.ws) {
      console.log('[DeviceWSManager] Disconnecting WebSocket');
      this.ws.disconnect();
      this.ws = null;
      this.subscribedDevices.clear();
    }
  }
}

export const deviceWSManager = DeviceWebSocketManager.getInstance();