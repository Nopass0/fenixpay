import { z } from "zod"

export const EmulatorDeviceConfigSchema = z.object({
  deviceCode: z.string(),
  bankType: z.enum(['SBER', 'TINK', 'VTB', 'ALFA', 'GAZPROM', 'OZON']),
  model: z.string().optional().default('Pixel 7 Pro'),
  androidVersion: z.string().optional().default('13'),
  initialBattery: z.number().min(40).max(100).optional().default(85),
  pingSec: z.number().optional(),
  notifyChance: z.number().min(0).max(1).optional(),
  spamChance: z.number().min(0).max(1).optional(),
  delayChance: z.number().min(0).max(1).optional(),
})

export const EmulatorConfigSchema = z.object({
  global: z.object({
    defaultPingSec: z.number().default(60),
    defaultNotifyChance: z.number().min(0).max(1).default(0.4),
    defaultSpamChance: z.number().min(0).max(1).default(0.05),
    defaultDelayChance: z.number().min(0).max(1).default(0.1),
    reconnectOnAuthError: z.boolean().default(true),
    rngSeed: z.number().optional(),
  }),
  devices: z.array(EmulatorDeviceConfigSchema),
})

export type EmulatorConfig = z.infer<typeof EmulatorConfigSchema>
export type EmulatorDeviceConfig = z.infer<typeof EmulatorDeviceConfigSchema>

export interface DeviceState {
  deviceCode: string
  token?: string
  batteryLevel: number
  isCharging: boolean
  networkInfo: string
  lastPing?: Date
  lastNotification?: Date
  isConnected: boolean
  connectCoroutine?: any
  pingCoroutine?: any
  notificationCoroutine?: any
}

export interface InfoPayload {
  batteryLevel: number
  isCharging: boolean
  networkInfo: string
  timestamp: number
  ethernetSpeed: number | null
}

export interface NotificationPayload {
  packageName: string
  appName: string
  title: string
  content: string
  timestamp: number
  priority: number
  category: string
}