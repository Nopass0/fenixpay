import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { randomBytes } from "crypto";

/* ---------- DTOs ---------- */
// Success response DTO
const SuccessResponseDTO = t.Object({
  status: t.String({
    description: "Status of the operation (success or error)",
    examples: ["success"],
  }),
  message: t.String({
    description: "Message describing the result",
    examples: ["Device info updated", "Notification received"],
  }),
});

// Error response DTO
const ErrorResponseDTO = t.Object({
  status: t.String({
    description: "Status of the operation (success or error)",
    examples: ["error"],
  }),
  message: t.String({
    description: "Error message describing what went wrong",
    examples: [
      "Device not found or invalid token",
      "No available bank details to assign to device",
    ],
  }),
});

// Authentication headers
const AuthHeaders = t.Object({
  authorization: t.String({
    description: "Bearer token for device authentication",
    examples: ["Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."],
  }),
});

// Device connect DTO based on documentation
const DeviceConnectDTO = t.Object({
  deviceCode: t.String({
    description: "Unique device identifier code",
    examples: ["ABC123"],
  }),
  batteryLevel: t.Number({
    description: "Current battery level percentage",
    examples: [85],
  }),
  networkInfo: t.String({
    description: "Current network connection type",
    examples: ["Wi-Fi"],
  }),
  deviceModel: t.String({
    description: "Device model name",
    examples: ["Google Pixel 7"],
  }),
  androidVersion: t.String({
    description: "Android version running on the device",
    examples: ["13"],
  }),
  appVersion: t.String({
    description: "Application version installed on the device",
    examples: ["1.0"],
  }),
});

// Device connect response DTO
const DeviceConnectResponseDTO = t.Object({
  status: t.String({
    description: "Status of the connection request",
    examples: ["success"],
  }),
  token: t.String({
    description: "Authentication token for future requests",
    examples: ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."],
  }),
  message: t.String({
    description: "Message describing the result",
    examples: ["Device connected successfully"],
  }),
});

// Device info update DTO - a more flexible version
const DeviceInfoUpdateDTO = t.Object(
  {
    batteryLevel: t.Optional(
      t.Number({
        description: "Current battery level percentage",
        examples: [75],
      }),
    ),
    isCharging: t.Optional(
      t.Boolean({
        description: "Whether the device is currently charging",
        examples: [true],
      }),
    ),
    networkInfo: t.Optional(
      t.String({
        description: "Current network connection type",
        examples: ["Mobile Data (4G)"],
      }),
    ),
    timestamp: t.Optional(
      t.Number({
        description: "Unix timestamp in milliseconds",
        examples: [1716717635423],
      }),
    ),
    deviceModel: t.Optional(
      t.String({
        description: "Device model name",
        examples: ["Google Pixel 7"],
      }),
    ),
    androidVersion: t.Optional(
      t.String({
        description: "Android version running on the device",
        examples: ["13"],
      }),
    ),
    type: t.Optional(
      t.String({
        description: "Custom type field for categorizing updates",
        examples: ["STATUS_UPDATE", "LOCATION_UPDATE"],
      }),
    ),
    energy: t.Optional(
      t.Union([
        t.Number({
          description: "Custom energy level field",
          examples: [85],
        }),
        t.Null(),
      ]),
    ),
    ethernetSpeed: t.Optional(
      t.Union([
        t.Number({
          description: "Network connection speed in Mbps",
          examples: [100],
        }),
        t.Null(),
      ]),
    ),
    location: t.Optional(
      t.String({
        description: "Device location information",
        examples: ["37.7749,-122.4194"],
      }),
    ),
    additionalInfo: t.Optional(
      t.String({
        description: "Any additional information as JSON string",
        examples: ['{"temperature":25,"humidity":60}'],
      }),
    ),
  },
  {
    additionalProperties: true,
    description:
      "The device update accepts any additional custom fields besides the documented ones",
  },
);

// Device notification DTO
const DeviceNotificationDTO = t.Object({
  packageName: t.String({
    description: "Package name of the app that generated the notification",
    examples: ["com.example.app"],
  }),
  appName: t.String({
    description: "Display name of the app that generated the notification",
    examples: ["Example App"],
  }),
  title: t.String({
    description: "Title of the notification",
    examples: ["New Message"],
  }),
  content: t.String({
    description: "Content of the notification",
    examples: ["Hello, how are you?"],
  }),
  timestamp: t.Number({
    description:
      "Unix timestamp in milliseconds when notification was received",
    examples: [1716717645212],
  }),
  priority: t.Number({
    description: "Priority level of the notification",
    examples: [1],
  }),
  category: t.String({
    description: "Category of the notification",
    examples: ["msg"],
  }),
});

/* ---------- helpers ---------- */
const generateToken = () => randomBytes(32).toString("hex");

/* ---------- device auth middleware ---------- */
const withDeviceAuth = async ({ headers, error, set }) => {
  try {
    const authHeader = headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      set.status = 401;
      return error(401, {
        status: "error",
        message: "Unauthorized: Missing or invalid token",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const device = await db.device.findFirst({
      where: { token },
    });

    if (!device) {
      set.status = 401;
      return error(401, {
        status: "error",
        message: "Device not found or invalid token",
      });
    }

    return { device };
  } catch (err) {
    console.error("Error in device authentication:", err);
    set.status = 500;
    return error(500, {
      status: "error",
      message: "Internal server error during authentication",
    });
  }
};

export default new Elysia()
  // Add request logging middleware
  .onBeforeHandle(({ request, body, path }) => {
    if (request.method === "POST") {
      console.log(`[Device API] ${request.method} ${path}`, {
        headers: Object.fromEntries(request.headers.entries()),
        body: body,
      });
    }
  })
  // Add response transform to ensure correct content-type
  .onAfterHandle(({ response, set }) => {
    set.headers['content-type'] = 'application/json';
    // Log only essential response info instead of full object
    console.log(`[Device API] Response:`, {
      status: response?.status || 'unknown',
      message: response?.message || 'no message',
      data: response?.data ? 'present' : 'none'
    });
    return response;
  })
  // Add onError handler to ensure all errors return the correct format
  .onError(({ code, error, set }) => {
    console.error("[Device API] Error:", code, error);
    
    // Ensure we always return the expected format
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        status: "error",
        message: error.message || "Validation error occurred"
      };
    }
    
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        status: "error",
        message: "Resource not found"
      };
    }
    
    // Default error response
    set.status = 500;
    return {
      status: "error",
      message: "Internal server error"
    };
  })
  // Simple test endpoint that updates device activity if token provided
  .get(
    "/ping", 
    async ({ headers, error }) => {
      try {
        // Check for device token in header (optional)
        const deviceToken = headers["x-device-token"];
        
        if (deviceToken) {
          // If token provided, update device status
          const device = await db.device.findFirst({
            where: { token: deviceToken },
          });
          
          if (device) {
            // Update device activity
            await db.device.update({
              where: { id: device.id },
              data: {
                lastActiveAt: new Date(),
                updatedAt: new Date(),
                isOnline: true,
                // If device was offline and had isWorking=false, restore it
                ...(device.isOnline === false && device.isWorking === false ? { isWorking: true } : {})
              }
            });
            
            // If device was offline, restore its bank cards
            if (!device.isOnline) {
              await db.bankDetail.updateMany({
                where: {
                  deviceId: device.id,
                  isArchived: true,
                },
                data: {
                  isArchived: false,
                }
              });
              
              console.log(`[Device Ping] Device ${device.name} restored online with bank cards`);
            }
          }
        }
        
        return { 
          status: "success", 
          message: "Device API is working" 
        };
      } catch (err) {
        console.error("Error in ping endpoint:", err);
        // Even on error, return success for basic connectivity check
        return { 
          status: "success", 
          message: "Device API is working" 
        };
      }
    }
  )
  // Health check endpoint that updates device activity
  .post(
    "/health-check",
    async (context) => {
      try {
        const { headers, body, error } = context;
        
        // Check for device token in header
        const deviceToken = headers["x-device-token"];
        if (!deviceToken) {
          return error(401, {
            status: "error",
            message: "Missing device token",
          });
        }
        
        const device = await db.device.findFirst({
          where: { token: deviceToken },
        });
        
        if (!device) {
          return error(401, {
            status: "error",
            message: "Invalid device token",
          });
        }
        
        // Update device info
        const updateData: any = {
          lastActiveAt: new Date(),
          isOnline: true,
        };
        
        // Update battery level if provided
        if (body && typeof body === 'object' && 'batteryLevel' in body) {
          updateData.energy = body.batteryLevel;
        }
        
        await db.device.update({
          where: { id: device.id },
          data: updateData,
        });
        
        return {
          status: "success",
          message: "Health check received",
        };
      } catch (err) {
        console.error("Error in health check:", err);
        return context.error(500, {
          status: "error",
          message: "Internal server error",
        });
      }
    },
    {
      headers: t.Object({
        "x-device-token": t.String({
          description: "Device token for authentication",
        }),
      }),
      body: t.Optional(
        t.Object({
          batteryLevel: t.Optional(t.Number()),
          networkSpeed: t.Optional(t.String()),
        })
      ),
      response: {
        200: SuccessResponseDTO,
        401: ErrorResponseDTO,
        500: ErrorResponseDTO,
      },
    }
  )
  // Test endpoint that accepts POST and returns the same structure
  .post(
    "/test",
    ({ body }) => {
      console.log("[Device API] Test endpoint received:", body);
      return {
        status: "success",
        message: "Test successful",
        received: body
      };
    },
    {
      body: t.Object({
        test: t.Optional(t.String())
      }),
      response: {
        200: t.Object({
          status: t.String(),
          message: t.String(),
          received: t.Any()
        })
      }
    }
  )
  .post(
    "/connect",
    async ({ body, error, set }) => {
      try {
        console.log("[Device Connect] Request received:", {
          deviceCode: body.deviceCode,
          deviceModel: body.deviceModel,
          batteryLevel: body.batteryLevel,
        });

        // Validate device code
        if (!body.deviceCode || typeof body.deviceCode !== 'string' || body.deviceCode.trim() === '') {
          console.log("[Device Connect] Invalid device code format:", body.deviceCode);
          set.status = 400;
          return {
            status: "error",
            message: "Device code is required and must be a non-empty string",
          };
        }

        // Find device by token
        const device = await db.device.findFirst({
          where: {
            token: body.deviceCode.trim(),
          },
          include: {
            user: true,
            bankDetails: {
              where: {
                isArchived: false,
              },
            },
          },
        });

        if (!device) {
          console.log("[Device Connect] Device not found with token:", body.deviceCode);
          set.status = 400;
          return {
            status: "error",
            message: "Invalid device code",
          };
        }

        console.log("[Device Connect] Found device:", {
          id: device.id,
          name: device.name,
          userId: device.userId,
          isOnline: device.isOnline,
          emulated: device.emulated
        });

        // Update device information
        const updatedDevice = await db.device.update({
          where: { id: device.id },
          data: {
            isOnline: true,
            lastActiveAt: new Date(),
            energy: body.batteryLevel || device.energy,
            ethernetSpeed: body.networkInfo?.includes("Wi-Fi") ? 100 : null,
            // Keep the emulated flag if it was set
            emulated: device.emulated || false
          }
        });

        console.log("[Device Connect] Device connected successfully:", device.id);

        // Return the existing token (no need to generate new one)
        const response = {
          status: "success",
          token: device.token,
          message: "Device connected successfully",
        };
        
        set.status = 200;
        return response;
      } catch (err) {
        console.error("[Device Connect] Error:", err);
        set.status = 500;
        return {
          status: "error",
          message: "Internal server error occurred while connecting device",
        };
      }
    },
    {
      body: DeviceConnectDTO,
      response: {
        200: DeviceConnectResponseDTO,
        400: ErrorResponseDTO,
        500: ErrorResponseDTO,
      },
    },
  )
  .post(
    "/info/update",
    async (context) => {
      try {
        const { body, error } = context;
        
        // Get device from context set by middleware
        const authResult = await withDeviceAuth(context);
        if (!authResult || !authResult.device) {
          return error(401, {
            status: "error",
            message: "Device authentication failed",
          });
        }
        
        const device = authResult.device;

        // Update device info based on the request
        const updateData: any = {
          isOnline: true,
          lastActiveAt: new Date(),
        };

        // Transfer all specific DB fields we want to store
        if (body.batteryLevel !== undefined)
          updateData.energy = body.batteryLevel;
        if (body.energy !== undefined) updateData.energy = body.energy;
        if (body.ethernetSpeed !== undefined)
          updateData.ethernetSpeed = body.ethernetSpeed;

        // Update the device with all the gathered data
        await db.device.update({
          where: { id: device.id },
          data: updateData,
        });

        // Using explicit object with required fields
        return {
          status: "success",
          message: "Device info updated",
        };
      } catch (err) {
        console.error("Error updating device info:", err);
        return context.error(500, {
          status: "error",
          message: "Internal server error occurred while updating device info",
        });
      }
    },
    {
      headers: AuthHeaders,
      body: DeviceInfoUpdateDTO,
      response: {
        200: SuccessResponseDTO,
        401: ErrorResponseDTO,
        500: ErrorResponseDTO,
      },
    },
  )
  .post(
    "/notification",
    async (context) => {
      try {
        const { body, error } = context;
        
        // Get device from context set by middleware
        const authResult = await withDeviceAuth(context);
        if (!authResult || !authResult.device) {
          return error(401, {
            status: "error",
            message: "Device authentication failed",
          });
        }
        
        const device = authResult.device;

        // Create notification in database
        await db.notification.create({
          data: {
            type: "AppNotification",
            application: body.appName,
            packageName: body.packageName, // Store in dedicated field for easier matching
            title: body.title,
            message: body.content,
            metadata: {
              packageName: body.packageName, // Keep in metadata for backward compatibility
              timestamp: body.timestamp,
              priority: body.priority,
              category: body.category,
            },
            deviceId: device.id,
          },
        });

        // Using explicit object with required fields
        return {
          status: "success",
          message: "Notification received",
        };
      } catch (err) {
        console.error("Error processing notification:", err);
        return context.error(500, {
          status: "error",
          message:
            "Internal server error occurred while processing notification",
        });
      }
    },
    {
      headers: AuthHeaders,
      body: DeviceNotificationDTO,
      response: {
        200: SuccessResponseDTO,
        401: ErrorResponseDTO,
        500: ErrorResponseDTO,
      },
    },
  );