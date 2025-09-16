import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Status, TransactionType, PayoutStatus } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { adminGuard } from "@/middleware/adminGuard";
import { NotificationMatcherService } from "@/services/NotificationMatcherService";
import { DeviceEmulatorService } from "@/services/DeviceEmulatorService";

const authHeader = t.Object({ "x-admin-key": t.String() });

export default (app: Elysia) =>
  app
    // Get all mock transactions
    .get("/transactions", async ({ set }) => {
      try {
        const transactions = await db.transaction.findMany({
          where: {
            metadata: {
              path: ["isMock"],
              equals: true
            }
          },
          include: {
            merchant: true,
            trader: true,
            bankDetail: true,
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 100
        });

        return transactions.map(tx => ({
          ...tx,
          isMock: true,
          bankType: tx.bankDetail?.bankType || null,
        }));
      } catch (error) {
        set.status = 500;
        return { error: "Failed to fetch mock transactions" };
      }
    }, {
      beforeHandle: adminGuard,
      tags: ["admin", "test"],
      headers: authHeader,
      response: {
        200: t.Array(t.Any()),
        500: ErrorSchema,
      },
    })

    // Get all mock payouts
    .get("/payouts", async ({ set }) => {
      try {
        const payouts = await db.payout.findMany({
          where: {
            metadata: {
              path: ["isMock"],
              equals: true
            }
          },
          include: {
            merchant: true,
            trader: true,
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 100
        });

        return payouts.map(p => ({
          ...p,
          isMock: true,
          profit: p.totalUsdt && p.amountUsdt ? p.totalUsdt - p.amountUsdt : 0,
        }));
      } catch (error) {
        set.status = 500;
        return { error: "Failed to fetch mock payouts" };
      }
    }, {
      beforeHandle: adminGuard,
      tags: ["admin", "test"],
      headers: authHeader,
      response: {
        200: t.Array(t.Any()),
        500: ErrorSchema,
      },
    })

    // Delete all mock data
    .delete("/delete-all", async ({ set }) => {
      try {
        // Delete mock transactions
        await db.transaction.deleteMany({
          where: {
            metadata: {
              path: ["isMock"],
              equals: true
            }
          }
        });

        // Delete mock payouts
        await db.payout.deleteMany({
          where: {
            metadata: {
              path: ["isMock"],
              equals: true
            }
          }
        });

        // Delete mock notifications
        await db.notification.deleteMany({
          where: {
            metadata: {
              path: ["isMock"],
              equals: true
            }
          }
        });

        return { success: true, message: "All mock data deleted" };
      } catch (error) {
        set.status = 500;
        return { error: "Failed to delete mock data" };
      }
    }, {
      beforeHandle: adminGuard,
      tags: ["admin", "test"],
      headers: authHeader,
      response: {
        200: t.Object({ 
          success: t.Boolean(), 
          message: t.String() 
        }),
        500: ErrorSchema,
      },
    })

    // Start device emulation
    .post("/emulate-device", async ({ body, set }) => {
      try {
        const { deviceToken } = body;
        
        // Find device by token
        const device = await db.device.findFirst({
          where: { token: deviceToken },
          include: { user: true }
        });

        if (!device) {
          set.status = 404;
          return { error: "Device not found" };
        }

        // Start emulation using DeviceEmulatorService
        const emulatorService = await DeviceEmulatorService.getInstance();
        const success = await emulatorService.startDeviceEmulation(device.id);

        if (!success) {
          set.status = 400;
          return { error: "Failed to start device emulation" };
        }

        // Update device status to online
        await db.device.update({
          where: { id: device.id },
          data: {
            isOnline: true,
            isWorking: true,
            lastActiveAt: new Date()
          }
        });

        return { 
          success: true, 
          message: "Device emulation started",
          deviceId: device.id 
        };
      } catch (error) {
        set.status = 500;
        return { error: "Failed to start device emulation" };
      }
    }, {
      beforeHandle: adminGuard,
      tags: ["admin", "test"],
      headers: authHeader,
      body: t.Object({
        deviceToken: t.String()
      }),
      response: {
        200: t.Object({ 
          success: t.Boolean(), 
          message: t.String(),
          deviceId: t.String()
        }),
        400: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    })

    // Simulate bank notification
    .post("/simulate-notification", async ({ body, set }) => {
      try {
        const { transactionId, amount, bankType } = body;
        
        // Find transaction
        const transaction = await db.transaction.findUnique({
          where: { id: transactionId },
          include: {
            bankDetail: {
              include: {
                device: true
              }
            },
            trader: true
          }
        });

        if (!transaction) {
          set.status = 404;
          return { error: "Transaction not found" };
        }

        if (!transaction.bankDetail || !transaction.bankDetail.device) {
          set.status = 400;
          return { error: "Transaction has no associated device" };
        }

        // Create mock notification with proper bank app package name
        const bankPackageMap: Record<string, string> = {
          "SBERBANK": "ru.sberbankmobile",
          "TINKOFF": "com.idamob.tinkoff.android",
          "VTB": "ru.vtb24.mobilebanking.android",
          "ALFABANK": "ru.alfabank.mobile.android",
          "RAIFFEISEN": "ru.raiffeisen.mobile",
          "default": "com.android.bank"
        };

        const packageName = bankPackageMap[bankType] || bankPackageMap.default;
        
        const notification = await db.notification.create({
          data: {
            deviceId: transaction.bankDetail.device.id,
            packageName: packageName,
            appName: bankType || transaction.bankDetail.bankType,
            title: `${bankType || transaction.bankDetail.bankType}`,
            content: `Поступление ${amount.toLocaleString('ru-RU')} ₽`,
            timestamp: new Date(),
            priority: 1,
            category: "transaction",
            type: "AppNotification",
            metadata: {
              isMock: true,
              amount: amount,
              transactionId: transactionId
            }
          }
        });

        // Process the notification to trigger transaction matching
        const notificationService = await NotificationMatcherService.getInstance();
        await notificationService.processNotification(notification);

        // Check if transaction was auto-confirmed
        const updatedTransaction = await db.transaction.findUnique({
          where: { id: transactionId },
          select: { status: true }
        });

        return { 
          success: true, 
          message: "Notification simulated",
          notificationId: notification.id,
          transactionStatus: updatedTransaction?.status
        };
      } catch (error) {
        console.error("Failed to simulate notification:", error);
        set.status = 500;
        return { error: "Failed to simulate notification" };
      }
    }, {
      beforeHandle: adminGuard,
      tags: ["admin", "test"],
      headers: authHeader,
      body: t.Object({
        transactionId: t.String(),
        amount: t.Number(),
        bankType: t.String()
      }),
      response: {
        200: t.Object({ 
          success: t.Boolean(), 
          message: t.String(),
          notificationId: t.String(),
          transactionStatus: t.Optional(t.String())
        }),
        400: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    })

    // Stop device emulation
    .post("/stop-emulation", async ({ body, set }) => {
      try {
        const { deviceId } = body;
        
        // Stop emulation using DeviceEmulatorService
        const emulatorService = await DeviceEmulatorService.getInstance();
        await emulatorService.stopDeviceEmulation(deviceId);

        // Update device status to offline
        await db.device.update({
          where: { id: deviceId },
          data: {
            isOnline: false,
            isWorking: false
          }
        });

        return { 
          success: true, 
          message: "Device emulation stopped" 
        };
      } catch (error) {
        set.status = 500;
        return { error: "Failed to stop device emulation" };
      }
    }, {
      beforeHandle: adminGuard,
      tags: ["admin", "test"],
      headers: authHeader,
      body: t.Object({
        deviceId: t.String()
      }),
      response: {
        200: t.Object({ 
          success: t.Boolean(), 
          message: t.String()
        }),
        500: ErrorSchema,
      },
    })

    // Get emulation status
    .get("/emulation-status", async ({ set }) => {
      try {
        const emulatorService = await DeviceEmulatorService.getInstance();
        const emulatedDevices = emulatorService.getEmulatedDevices();

        return {
          emulatedDevices: Array.from(emulatedDevices),
          count: emulatedDevices.size
        };
      } catch (error) {
        set.status = 500;
        return { error: "Failed to get emulation status" };
      }
    }, {
      beforeHandle: adminGuard,
      tags: ["admin", "test"],
      headers: authHeader,
      response: {
        200: t.Object({ 
          emulatedDevices: t.Array(t.String()),
          count: t.Number()
        }),
        500: ErrorSchema,
      },
    });