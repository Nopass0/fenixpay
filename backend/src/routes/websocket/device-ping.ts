import { Elysia } from "elysia";
import { db } from "@/db";
import { broadcastDeviceStatus, broadcastBankDetailsStatus } from "./device-status";

// Map to track active WebSocket connections by device token
const deviceConnections = new Map<string, WebSocket>();
const devicePingTimers = new Map<string, NodeJS.Timeout>();

// Function to handle device disconnection
async function handleDeviceDisconnection(deviceId: string) {
  try {
    // Get device current state
    const device = await db.device.findUnique({
      where: { id: deviceId }
    });

    if (!device) return;

    // Mark device as offline and stop working if it was working
    const updateData: any = { 
      isOnline: false
    };

    // Only stop if device was working
    if (device.isWorking) {
      updateData.isWorking = false;
      console.log(`[DevicePing] Auto-stopping device ${deviceId} due to connection loss`);
    }

    await db.device.update({
      where: { id: deviceId },
      data: updateData
    });

    // Find all bank details associated with this device
    const bankDetails = await db.bankDetail.findMany({
      where: {
        user: {
          devices: {
            some: { id: deviceId }
          }
        }
      },
      include: {
        user: true
      }
    });

    console.log(`[DevicePing] Device ${deviceId} disconnected, stopping device and disabling ${bankDetails.length} bank details`);

    // Disable all bank details for this device's user
    for (const bankDetail of bankDetails) {
      await db.bankDetail.update({
        where: { id: bankDetail.id },
        data: { isArchived: true }
      });

      console.log(`[DevicePing] Disabled bank detail ${bankDetail.id} for user ${bankDetail.userId}`);
    }

    // Broadcast bank details disabled event
    await broadcastBankDetailsStatus(deviceId, {
      disabled: true,
      count: bankDetails.length
    });

    // Create notification about device disconnection
    await db.notification.create({
      data: {
        type: 'DEVICE_DISCONNECTED',
        title: 'Устройство отключено',
        message: `Устройство отключено от сети. Устройство остановлено, реквизиты временно недоступны для сделок.`,
        deviceId: deviceId,
        metadata: {
          disconnectedAt: new Date().toISOString(),
          disabledBankDetails: bankDetails.length
        },
        isRead: false
      }
    });

  } catch (error) {
    console.error(`[DevicePing] Error stopping device and disabling bank details for device ${deviceId}:`, error);
  }
}

// Keep original function name for compatibility
async function disableBankDetailsForDevice(deviceId: string) {
  return handleDeviceDisconnection(deviceId);
}

// Function to re-enable bank details when device comes online
async function enableBankDetailsForDevice(deviceId: string) {
  try {
    // Find the device and its user
    const device = await db.device.findUnique({
      where: { id: deviceId },
      include: { user: true }
    });

    if (!device) return;

    // Re-enable bank details that were archived due to device disconnection
    const bankDetails = await db.bankDetail.findMany({
      where: {
        userId: device.userId,
        isArchived: true
      }
    });

    console.log(`[DevicePing] Device ${deviceId} reconnected, re-enabling ${bankDetails.length} bank details`);

    for (const bankDetail of bankDetails) {
      await db.bankDetail.update({
        where: { id: bankDetail.id },
        data: { isArchived: false }
      });

      console.log(`[DevicePing] Re-enabled bank detail ${bankDetail.id} for user ${device.userId}`);
    }

    // Broadcast bank details enabled event
    await broadcastBankDetailsStatus(deviceId, {
      disabled: false,
      count: bankDetails.length
    });

    // Create notification about device reconnection
    await db.notification.create({
      data: {
        type: 'DEVICE_CONNECTED',
        title: 'Устройство подключено',
        message: `Устройство подключено. Реквизиты снова доступны для сделок.`,
        deviceId: deviceId,
        metadata: {
          connectedAt: new Date().toISOString(),
          enabledBankDetails: bankDetails.length
        },
        isRead: false
      }
    });

  } catch (error) {
    console.error(`[DevicePing] Error enabling bank details for device ${deviceId}:`, error);
  }
}

export const devicePingRoutes = new Elysia()
  .ws("/device-ping", {
    async open(ws) {
      console.log(`[DevicePing] WebSocket connection opened from ${ws.data?.request?.headers?.origin || 'unknown'}`);
      console.log(`[DevicePing] Headers:`, ws.data?.request?.headers);
    },

    async message(ws, message) {
      try {
        console.log(`[DevicePing] Received message:`, message.toString());
        const data = JSON.parse(message.toString());
        
        if (data.type === "ping" && data.deviceToken) {
          const deviceToken = data.deviceToken;
          console.log(`[DevicePing] Processing ping from device token: ${deviceToken}`);
          
          // Find device by token
          const device = await db.device.findFirst({
            where: { token: deviceToken }
          });

          if (!device) {
            ws.send(JSON.stringify({ 
              type: "error", 
              message: "Invalid device token" 
            }));
            ws.close();
            return;
          }

          // Store connection for this device
          const previousConnection = deviceConnections.get(deviceToken);
          if (previousConnection && previousConnection !== ws && previousConnection.readyState === WebSocket.OPEN) {
            // Close previous connection
            previousConnection.close();
          }
          
          deviceConnections.set(deviceToken, ws);

          // Clear existing timer if any
          const existingTimer = devicePingTimers.get(deviceToken);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }

          // Update device status immediately
          const wasOnline = device.isOnline;
          const batteryLevel = data.batteryLevel !== undefined ? data.batteryLevel : device.energy;
          const networkSpeed = data.networkSpeed !== undefined ? data.networkSpeed : device.ethernetSpeed;
          
          // Check if this is the first connection
          const updateData: any = {
            isOnline: true,
            lastActiveAt: new Date(),
            updatedAt: new Date(),
            energy: batteryLevel,
            ethernetSpeed: networkSpeed
          };
          
          // Set firstConnectionAt if not already set
          if (!device.firstConnectionAt) {
            updateData.firstConnectionAt = new Date();
            console.log(`[DevicePing] Setting firstConnectionAt for device ${device.id} (${device.name})`);
          }
          
          const updatedDevice = await db.device.update({
            where: { id: device.id },
            data: updateData
          });
          
          // Log the update result
          console.log(`[DevicePing] Device ${device.id} update result:`, {
            hadFirstConnectionAt: !!device.firstConnectionAt,
            nowHasFirstConnectionAt: !!updatedDevice.firstConnectionAt,
            firstConnectionAt: updatedDevice.firstConnectionAt,
            updateData: updateData
          });
          
          if (!device.firstConnectionAt && updatedDevice.firstConnectionAt) {
            console.log(`[DevicePing] Successfully set firstConnectionAt for device ${device.id}: ${updatedDevice.firstConnectionAt}`);
            
            // Force broadcast the update to ensure frontend gets notified
            await broadcastDeviceStatus(device.id, {
              isOnline: true,
              batteryLevel: batteryLevel,
              networkSpeed: networkSpeed
            });
          }

          // If device was offline and now online, re-enable bank details
          if (!wasOnline) {
            await enableBankDetailsForDevice(device.id);
          }
          
          // Broadcast device status update
          await broadcastDeviceStatus(device.id, {
            isOnline: true,
            batteryLevel: batteryLevel,
            networkSpeed: networkSpeed
          });

          // Set timer for 3 seconds - if no ping received, mark as offline
          const timer = setTimeout(async () => {
            console.log(`[DevicePing] Device ${device.id} (${device.name}) timed out`);
            
            try {
              // Get current device state
              const currentDevice = await db.device.findUnique({
                where: { id: device.id }
              });

              if (!currentDevice) return;

              const updateData: any = { 
                isOnline: false
              };

              // Only stop if device was working
              if (currentDevice.isWorking) {
                updateData.isWorking = false;
                console.log(`[DevicePing] Auto-stopping device ${device.id} due to timeout`);
              }

              // Mark device as offline
              await db.device.update({
                where: { id: device.id },
                data: updateData
              });

              // Broadcast device offline status
              await broadcastDeviceStatus(device.id, {
                isOnline: false
              });

              // Disable bank details
              await disableBankDetailsForDevice(device.id);

              // Remove from connections
              deviceConnections.delete(deviceToken);
              devicePingTimers.delete(deviceToken);

              // Close WebSocket if still open
              if (ws.readyState === WebSocket.OPEN) {
                ws.close();
              }

            } catch (error) {
              console.error(`[DevicePing] Error handling timeout for device ${device.id}:`, error);
            }
          }, 30000); // 30 seconds timeout - increased for mobile network latency and reconnection

          devicePingTimers.set(deviceToken, timer);

          // Send pong response
          ws.send(JSON.stringify({ 
            type: "pong", 
            timestamp: new Date().toISOString(),
            deviceId: device.id,
            status: "online",
            batteryLevel: batteryLevel,
            networkSpeed: networkSpeed
          }));

          console.log(`[DevicePing] Ping received from device ${device.id} (${device.name})`);
        }
      } catch (error) {
        console.error(`[DevicePing] Error processing message:`, error);
        ws.send(JSON.stringify({ 
          type: "error", 
          message: "Invalid message format" 
        }));
      }
    },

    async close(ws) {
      console.log(`[DevicePing] WebSocket connection closed`);
      
      // Find and clean up this connection
      for (const [deviceToken, connection] of deviceConnections.entries()) {
        if (connection === ws) {
          const timer = devicePingTimers.get(deviceToken);
          if (timer) {
            clearTimeout(timer);
            devicePingTimers.delete(deviceToken);
          }
          
          deviceConnections.delete(deviceToken);
          
          // Find device and mark as offline
          try {
            const device = await db.device.findFirst({
              where: { token: deviceToken }
            });
            
            if (device) {
              // Get current device state
              const currentDevice = await db.device.findUnique({
                where: { id: device.id }
              });

              if (currentDevice) {
                const updateData: any = { 
                  isOnline: false
                };

                // Only stop if device was working
                if (currentDevice.isWorking) {
                  updateData.isWorking = false;
                  console.log(`[DevicePing] Auto-stopping device ${device.id} due to connection close`);
                }

                await db.device.update({
                  where: { id: device.id },
                  data: updateData
                });
              }
              
              // Broadcast device offline status
              await broadcastDeviceStatus(device.id, {
                isOnline: false
              });
              
              await disableBankDetailsForDevice(device.id);
              console.log(`[DevicePing] Device ${device.id} marked as offline due to connection close`);
            }
          } catch (error) {
            console.error(`[DevicePing] Error marking device as offline:`, error);
          }
          
          break;
        }
      }
    }
  });