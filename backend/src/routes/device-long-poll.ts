import { Elysia, t } from "elysia";
import { db } from "@/db";
import { broadcastDeviceStatus } from "@/routes/websocket/device-status";

// Store active long-polling connections
const activeConnections = new Map<string, { 
  resolve: (value: any) => void,
  timeout: NodeJS.Timeout
}>();

export const deviceLongPollRoutes = new Elysia({ prefix: "/api/device" })
  // Long-polling endpoint for stable connection
  .post(
    "/long-poll",
    async ({ body, headers, set }) => {
      const deviceToken = headers['x-device-token'];
      
      if (!deviceToken) {
        set.status = 400;
        return { error: "Device token required" };
      }
      
      // Find device
      const device = await db.device.findFirst({
        where: { token: deviceToken }
      });
      
      if (!device) {
        set.status = 401;
        return { error: "Invalid device token" };
      }
      
      // Update device status
      const updateData: any = {
        isOnline: true,
        lastActiveAt: new Date(),
        updatedAt: new Date()
      };
      
      if (body.batteryLevel !== undefined) {
        updateData.energy = body.batteryLevel;
      }
      if (body.networkSpeed !== undefined) {
        updateData.ethernetSpeed = body.networkSpeed;
      }
      
      // Set firstConnectionAt if not set
      if (!device.firstConnectionAt) {
        updateData.firstConnectionAt = new Date();
        console.log(`[LongPoll] Setting firstConnectionAt for device ${device.id}`);
      }
      
      await db.device.update({
        where: { id: device.id },
        data: updateData
      });
      
      // Broadcast status update
      await broadcastDeviceStatus(device.id, {
        isOnline: true,
        batteryLevel: body.batteryLevel,
        networkSpeed: body.networkSpeed
      });
      
      // Cancel any existing connection for this device
      const existing = activeConnections.get(device.id);
      if (existing) {
        clearTimeout(existing.timeout);
        existing.resolve({ status: "replaced" });
      }
      
      // Create promise that will resolve when we have a command for the device
      return new Promise((resolve) => {
        // Store the connection
        const timeout = setTimeout(() => {
          activeConnections.delete(device.id);
          resolve({ 
            status: "timeout",
            keepAlive: true,
            deviceStatus: {
              id: device.id,
              isOnline: true,
              isWorking: device.isWorking
            }
          });
        }, 25000); // 25 second timeout (client should reconnect before 30s)
        
        activeConnections.set(device.id, { resolve, timeout });
        
        // Check if device has any pending commands
        checkPendingCommands(device.id, resolve, timeout);
      });
    },
    {
      body: t.Object({
        batteryLevel: t.Optional(t.Number()),
        networkSpeed: t.Optional(t.Number()),
        timestamp: t.Optional(t.Number())
      }),
      headers: t.Object({
        'x-device-token': t.String()
      })
    }
  )
  
  // Endpoint to send commands to devices
  .post(
    "/send-command",
    async ({ body }) => {
      const connection = activeConnections.get(body.deviceId);
      if (connection) {
        clearTimeout(connection.timeout);
        activeConnections.delete(body.deviceId);
        connection.resolve({
          status: "command",
          command: body.command,
          data: body.data
        });
        return { success: true, message: "Command sent" };
      }
      
      return { success: false, message: "Device not connected" };
    },
    {
      body: t.Object({
        deviceId: t.String(),
        command: t.String(),
        data: t.Optional(t.Any())
      })
    }
  );

async function checkPendingCommands(deviceId: string, resolve: Function, timeout: NodeJS.Timeout) {
  // Here you can check for any pending commands for the device
  // For now, just return the current device status
  const device = await db.device.findUnique({
    where: { id: deviceId }
  });
  
  if (device && !device.isOnline) {
    // Device went offline, close the connection
    clearTimeout(timeout);
    activeConnections.delete(deviceId);
    resolve({
      status: "offline",
      message: "Device is offline"
    });
  }
}