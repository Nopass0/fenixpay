import { z } from "zod";

export const EmulatorDeviceConfigSchema = z.object({
  deviceCode: z.string().describe("Bank detail ID to connect to"),
  deviceModel: z.string().default("Google Pixel 7"),
  androidVersion: z.string().default("13"),
  appVersion: z.string().default("1.0"),
  batteryRange: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]).default([70, 90]),
  networkTypes: z.array(z.string()).default(["Wi-Fi", "Mobile Data (4G)", "Mobile Data (5G)"]),
  pingInterval: z.number().min(10).default(60), // seconds
  notificationSchedule: z.union([
    z.object({
      type: z.literal("cron"),
      pattern: z.string(), // cron pattern
    }),
    z.object({
      type: z.literal("random"),
      minInterval: z.number().min(30), // seconds
      maxInterval: z.number().min(60), // seconds
      probability: z.number().min(0).max(1).default(0.1), // probability per check
    }),
  ]).default({ type: "random", minInterval: 300, maxInterval: 600, probability: 0.1 }),
});

export const EmulatorConfigSchema = z.object({
  enabled: z.boolean().default(false),
  devices: z.array(EmulatorDeviceConfigSchema).default([]),
  seed: z.number().optional(), // PRNG seed
  delayProbability: z.number().min(0).max(1).default(0.2), // Chance of delayed response
  delayRange: z.tuple([z.number(), z.number()]).default([500, 3000]), // ms
  spamProbability: z.number().min(0).max(1).default(0.05), // Chance of spam notifications
  outageProbability: z.number().min(0).max(1).default(0.01), // Chance of device going offline
  outageMinDuration: z.number().min(60).default(300), // seconds
  outageMaxDuration: z.number().min(120).default(1800), // seconds
  apiBaseUrl: z.string().default("http://localhost:3000/api"),
});

export type EmulatorConfig = z.infer<typeof EmulatorConfigSchema>;
export type EmulatorDeviceConfig = z.infer<typeof EmulatorDeviceConfigSchema>;

export interface EmulatedDevice {
  id: string;
  config: EmulatorDeviceConfig;
  token?: string;
  isOnline: boolean;
  battery: number;
  network: string;
  lastPing: Date;
  lastNotification?: Date;
  pingTimer?: NodeJS.Timeout;
  notificationTimer?: NodeJS.Timeout;
  outageTimer?: NodeJS.Timeout;
}

export interface DeviceEmulatorState {
  devices: Map<string, EmulatedDevice>;
  isRunning: boolean;
  startedAt?: Date;
  totalNotificationsSent: number;
  totalPingsSent: number;
  totalOutages: number;
}