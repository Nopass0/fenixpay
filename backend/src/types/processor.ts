import { z } from "zod";

export const ProcessorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  pollIntervalSec: z.number().min(1).default(5),
  deviceOfflineThresholdSec: z.number().min(60).default(120),
  batchSize: z.number().min(1).max(100).default(20),
  callbackConcurrency: z.number().min(1).max(10).default(3),
  callbackTimeout: z.number().min(1000).default(30000), // ms
  callbackRetries: z.number().min(0).max(5).default(3),
  callbackRetryDelay: z.number().min(100).default(1000), // ms
  enableDeviceWatchdog: z.boolean().default(true),
  watchdogIntervalSec: z.number().min(10).default(30),
  minTimeDiffMs: z.number().min(0).default(300000), // 5 minutes - max time diff between notification and transaction
  amountTolerance: z.number().min(0).default(1), // +/- 1 RUB tolerance
});

export type ProcessorConfig = z.infer<typeof ProcessorConfigSchema>;

export interface ProcessorStats {
  totalProcessed: number;
  successfulMatches: number;
  failedMatches: number;
  callbacksSent: number;
  callbacksFailed: number;
  devicesMarkedOffline: number;
  lastRunTime?: Date;
  averageProcessingTime: number;
}