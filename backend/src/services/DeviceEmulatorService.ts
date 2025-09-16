import { BaseService } from "./BaseService"
import { db } from "@/db"
import { SeededRandom } from "@/utils/random"
import { DeviceApiClient } from "@/utils/device-api-client"
import { bankTemplates, spamTemplates } from "@/device-templates"
import type { 
  EmulatorConfig, 
  EmulatorDeviceConfig,
  DeviceState,
  InfoPayload,
  NotificationPayload
} from "@/types/device-emulator"
import { EmulatorConfigSchema } from "@/types/device-emulator"
import { Counter, Gauge } from "prom-client"

// Prometheus metrics
const sentNotificationsCounter = new Counter({
  name: 'des_sent_notifications_total',
  help: 'Total number of notifications sent by Device Emulator Service',
  labelNames: ['device', 'type'], // type: valid, spam
})

const failedRequestsCounter = new Counter({
  name: 'des_failed_requests_total',
  help: 'Total number of failed requests in Device Emulator Service',
  labelNames: ['device', 'operation'], // operation: connect, ping, notify
})

const activeDevicesGauge = new Gauge({
  name: 'des_active_devices',
  help: 'Number of active virtual devices in Device Emulator Service',
})

export class DeviceEmulatorService extends BaseService {
  private config: EmulatorConfig = {
    global: {
      defaultPingSec: 60,
      defaultNotifyChance: 0.4,
      defaultSpamChance: 0.05,
      defaultDelayChance: 0.1,
      reconnectOnAuthError: true,
    },
    devices: [],
  }
  private devices: Map<string, DeviceState> = new Map()
  private apiClients: Map<string, DeviceApiClient> = new Map()
  private random: SeededRandom
  private isRunning = false
  private reconnectInterval = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    super({
      displayName: "Device Emulator Service",
      description: "Emulates virtual devices for testing Device API",
      enabled: false,
      autoStart: false,
      tags: ["emulator", "testing", "device"],
    })

    this.random = new SeededRandom()
    this.interval = 10000 // Check config every 10 seconds
  }

  protected async onStart(): Promise<void> {
    await this.loadConfig()
    
    // Check if service should be enabled
    const envEnabled = process.env.DES_ENABLED === 'true'
    const dbConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: 'device_emulator' }
    })
    
    if (!envEnabled || !dbConfig?.isEnabled) {
      await this.logInfo("Service disabled by configuration", {
        envEnabled,
        dbEnabled: dbConfig?.isEnabled,
      })
      return
    }

    this.isRunning = true
    await this.startDevices()
  }

  protected async onStop(): Promise<void> {
    this.isRunning = false
    await this.stopDevices()
  }

  protected async tick(): Promise<void> {
    // Reload config periodically
    const oldDeviceCount = this.config.devices.length
    await this.loadConfig()
    
    if (oldDeviceCount !== this.config.devices.length && this.isRunning) {
      await this.logInfo("Device configuration changed, restarting devices")
      await this.stopDevices()
      await this.startDevices()
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const serviceConfig = await db.serviceConfig.findUnique({
        where: { serviceKey: "device_emulator" },
      })

      if (serviceConfig?.config) {
        this.config = EmulatorConfigSchema.parse(serviceConfig.config)
        
        // Set RNG seed if provided
        if (this.config.global.rngSeed) {
          this.random.reset(this.config.global.rngSeed)
        }
      }
    } catch (error) {
      await this.logError("Failed to load config", { error })
    }
  }

  private async startDevices(): Promise<void> {
    const baseUrl = process.env.DEVICE_API_URL || 'http://localhost:3000'
    
    for (const deviceConfig of this.config.devices) {
      await this.startDevice(deviceConfig, baseUrl)
    }
    
    activeDevicesGauge.set(this.devices.size)
    await this.logInfo(`Started ${this.devices.size} virtual devices`)
  }

  private async stopDevices(): Promise<void> {
    for (const [deviceCode, state] of this.devices.entries()) {
      await this.stopDevice(deviceCode, state)
    }
    
    this.devices.clear()
    this.apiClients.clear()
    activeDevicesGauge.set(0)
  }

  private async startDevice(config: EmulatorDeviceConfig, baseUrl: string): Promise<void> {
    const deviceCode = config.deviceCode
    
    // Initialize device state
    const state: DeviceState = {
      deviceCode,
      batteryLevel: config.initialBattery || 85,
      isCharging: false,
      networkInfo: this.getRandomNetwork(),
      isConnected: false,
    }
    
    this.devices.set(deviceCode, state)
    
    // Create API client
    const apiClient = new DeviceApiClient(baseUrl)
    this.apiClients.set(deviceCode, apiClient)
    
    // Start connect coroutine
    this.startConnectTask(deviceCode, config)
    
    // Start ping coroutine
    const pingSec = config.pingSec || this.config.global.defaultPingSec
    state.pingCoroutine = setInterval(() => {
      this.runPingTask(deviceCode, config)
    }, pingSec * 1000)
    
    // Start notification coroutine
    // Use separate interval for notifications (more frequent than pings)
    const notifyIntervalSec = (config as any).notifyIntervalSec || Math.min(pingSec / 2, 20)
    state.notificationCoroutine = setInterval(() => {
      this.runNotificationTask(deviceCode, config)
    }, notifyIntervalSec * 1000)
    
    await this.logInfo(`Started virtual device: ${deviceCode}`)
  }

  private async stopDevice(deviceCode: string, state: DeviceState): Promise<void> {
    // Clear intervals
    if (state.connectCoroutine) {
      clearTimeout(state.connectCoroutine)
    }
    if (state.pingCoroutine) {
      clearInterval(state.pingCoroutine)
    }
    if (state.notificationCoroutine) {
      clearInterval(state.notificationCoroutine)
    }
    
    await this.logInfo(`Stopped virtual device: ${deviceCode}`)
  }

  private async startConnectTask(deviceCode: string, config: EmulatorDeviceConfig): Promise<any> {
    const connect = async () => {
      try {
        const state = this.devices.get(deviceCode)
        const apiClient = this.apiClients.get(deviceCode)
        
        if (!state || !apiClient) return
        
        await this.logInfo(`Attempting to connect device: ${deviceCode}`, {
          model: config.model,
          bankType: config.bankType
        })
        
        const token = await apiClient.connect(
          deviceCode,
          config.model || 'Pixel 7 Pro',
          config.androidVersion || '13',
          state.batteryLevel
        )
        
        state.token = token
        state.isConnected = true
        
        await this.logInfo(`Device connected: ${deviceCode}`, { 
          token: token.substring(0, 10) + '...',
          model: config.model,
          bankType: config.bankType 
        })
        
        // Schedule reconnect after 24 hours
        state.connectCoroutine = setTimeout(() => {
          this.startConnectTask(deviceCode, config)
        }, this.reconnectInterval)
        
      } catch (error: any) {
        const state = this.devices.get(deviceCode)
        if (state) {
          failedRequestsCounter.inc({ device: deviceCode, operation: 'connect' })
          await this.logError(`Failed to connect device: ${deviceCode}`, { 
            error: error.message || error,
            deviceCode,
            bankType: config.bankType,
            model: config.model
          })
          
          // Retry after 5 minutes
          state.connectCoroutine = setTimeout(() => {
            this.startConnectTask(deviceCode, config)
          }, 5 * 60 * 1000)
        }
      }
    }
    
    // Add random delay if configured
    const delayChance = config.delayChance || this.config.global.defaultDelayChance
    if (this.random.nextBoolean(delayChance)) {
      const delay = this.random.nextInt(50000, 120000) // 50-120 seconds
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    await connect()
  }

  private async runPingTask(deviceCode: string, config: EmulatorDeviceConfig): Promise<void> {
    const state = this.devices.get(deviceCode)
    const apiClient = this.apiClients.get(deviceCode)
    
    if (!state || !apiClient || !state.isConnected) return
    
    try {
      // Update battery level
      if (!state.isCharging) {
        state.batteryLevel -= this.random.nextInt(1, 3)
        if (state.batteryLevel < 15) {
          state.isCharging = true
        }
      } else {
        state.batteryLevel += this.random.nextInt(2, 5)
        if (state.batteryLevel > 95) {
          state.isCharging = false
        }
      }
      
      state.batteryLevel = Math.max(5, Math.min(100, state.batteryLevel))
      
      // Random network change
      if (this.random.nextBoolean(0.1)) {
        state.networkInfo = this.getRandomNetwork()
      }
      
      const payload: InfoPayload = {
        batteryLevel: state.batteryLevel,
        isCharging: state.isCharging,
        networkInfo: state.networkInfo,
        timestamp: Date.now(),
        ethernetSpeed: state.networkInfo.includes("Wi-Fi") ? 100 : null,
      }
      
      // Add random delay if configured
      const delayChance = config.delayChance || this.config.global.defaultDelayChance
      if (this.random.nextBoolean(delayChance)) {
        const delay = this.random.nextInt(50000, 120000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      await apiClient.updateInfo(payload)
      state.lastPing = new Date()
      
    } catch (error: any) {
      failedRequestsCounter.inc({ device: deviceCode, operation: 'ping' })
      
      if (error.message === 'AUTH_ERROR' && this.config.global.reconnectOnAuthError) {
        state.isConnected = false
        await this.startConnectTask(deviceCode, config)
      }
    }
  }

  private async runNotificationTask(deviceCode: string, config: EmulatorDeviceConfig): Promise<void> {
    const state = this.devices.get(deviceCode)
    const apiClient = this.apiClients.get(deviceCode)
    
    if (!state || !apiClient || !state.isConnected) return
    
    const notifyChance = config.notifyChance || this.config.global.defaultNotifyChance
    const spamChance = config.spamChance || this.config.global.defaultSpamChance
    
    // Decide what to send
    const shouldNotify = this.random.nextBoolean(notifyChance)
    const shouldSpam = this.random.nextBoolean(spamChance)
    
    if (!shouldNotify && !shouldSpam) return
    
    try {
      let payload: NotificationPayload
      
      if (shouldSpam || !shouldNotify) {
        // Send spam
        payload = await this.generateSpamNotification(config.bankType)
        sentNotificationsCounter.inc({ device: deviceCode, type: 'spam' })
      } else {
        // Send valid bank notification
        payload = await this.generateBankNotification(deviceCode, config)
        sentNotificationsCounter.inc({ device: deviceCode, type: 'valid' })
      }
      
      // Add random delay if configured
      const delayChance = config.delayChance || this.config.global.defaultDelayChance
      if (this.random.nextBoolean(delayChance)) {
        const delay = this.random.nextInt(50000, 120000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      await apiClient.sendNotification(payload)
      state.lastNotification = new Date()
      
    } catch (error: any) {
      failedRequestsCounter.inc({ device: deviceCode, operation: 'notify' })
      
      if (error.message === 'AUTH_ERROR' && this.config.global.reconnectOnAuthError) {
        state.isConnected = false
        await this.startConnectTask(deviceCode, config)
      }
    }
  }

  private async generateBankNotification(deviceCode: string, config: EmulatorDeviceConfig): Promise<NotificationPayload> {
    const template = bankTemplates[config.bankType]
    if (!template) {
      throw new Error(`No template for bank type: ${config.bankType}`)
    }
    
    // Get recent transaction amount or generate random
    const amount = await this.getRecentTransactionAmount(deviceCode) || 
                   this.random.nextInt(1000, 50000)
    
    const balance = this.random.nextInt(amount, amount * 10)
    const sender = this.generateSenderName()
    const last4 = this.random.nextInt(1000, 9999).toString()
    
    // Pick random template
    const templateStr = this.random.pick(template.incoming)
    
    // Replace placeholders
    const content = templateStr
      .replace('{{amount}}', amount.toLocaleString('ru-RU'))
      .replace('{{sender}}', sender)
      .replace('{{balance}}', balance.toLocaleString('ru-RU'))
      .replace('{{last4}}', last4)
    
    return {
      packageName: template.packageName,
      appName: template.appName,
      title: "Пополнение",
      content,
      timestamp: Date.now(),
      priority: 1,
      category: "msg",
    }
  }

  private async generateSpamNotification(bankType: string): Promise<NotificationPayload> {
    const templates = spamTemplates[bankType] || []
    const template = bankTemplates[bankType]
    
    if (!template) {
      throw new Error(`No template for bank type: ${bankType}`)
    }
    
    const content = templates.length > 0 
      ? this.random.pick(templates)
      : "Специальное предложение от банка!"
    
    return {
      packageName: template.packageName,
      appName: template.appName,
      title: "Уведомление",
      content,
      timestamp: Date.now(),
      priority: 0,
      category: "msg",
    }
  }

  private async getRecentTransactionAmount(deviceCode: string): Promise<number | null> {
    try {
      // Find device first (remove emulated restriction to work with all devices)
      const device = await db.device.findFirst({
        where: { 
          token: deviceCode
        }
      })
      
      if (!device) {
        await this.logInfo(`Device not found for transaction lookup: ${deviceCode}`)
        return null
      }
      
      // Find bank detail for this device
      const bankDetail = await db.bankDetail.findFirst({
        where: { deviceId: device.id }
      })
      
      if (!bankDetail) {
        await this.logInfo(`No bank detail found for device: ${deviceCode}`)
        return null
      }
      
      // Look for active transactions first (high priority for matching)
      const activeTransactions = await db.transaction.findMany({
        where: {
          OR: [
            { bankDetailId: bankDetail.id },
            { userId: device.userId } // Also check user's other transactions
          ],
          status: { in: ["CREATED", "IN_PROGRESS"] }, // Active statuses
          createdAt: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours for active deals
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
      
      if (activeTransactions.length > 0) {
        // Pick a random active transaction to increase matching chances
        const randomTransaction = activeTransactions[Math.floor(Math.random() * activeTransactions.length)]
        await this.logInfo(`Using active transaction amount: ${randomTransaction.amount} (status: ${randomTransaction.status})`)
        return randomTransaction.amount
      }
      
      // Fallback: look for any recent transactions
      const recentTransactions = await db.transaction.findMany({
        where: {
          bankDetailId: bankDetail.id,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
      
      if (recentTransactions.length > 0) {
        const randomRecent = recentTransactions[Math.floor(Math.random() * recentTransactions.length)]
        await this.logInfo(`Using recent transaction amount: ${randomRecent.amount}`)
        return randomRecent.amount
      }
      
      await this.logInfo(`No transactions found for device: ${deviceCode}, will use random amount`)
      return null
    } catch (error) {
      await this.logError(`Error getting recent transaction amount: ${deviceCode}`, { error })
      return null
    }
  }

  private generateSenderName(): string {
    const firstNames = ["Иван", "Петр", "Анна", "Мария", "Алексей", "Елена", "Дмитрий", "Ольга", "Сергей", "Наталья"]
    const lastInitials = ["А", "Б", "В", "Г", "Д", "Е", "К", "М", "П", "С", "Т", "Ф"]
    
    const firstName = this.random.pick(firstNames)
    const lastInitial = this.random.pick(lastInitials)
    
    return `${firstName} ${lastInitial}.`
  }

  private getRandomNetwork(): string {
    const networks = ["Wi-Fi", "4G", "5G", "LTE", "3G"]
    return this.random.pick(networks)
  }

  public async reload(config: EmulatorConfig): Promise<void> {
    this.config = EmulatorConfigSchema.parse(config)
    
    if (this.config.global.rngSeed) {
      this.random.reset(this.config.global.rngSeed)
    }
    
    if (this.isRunning) {
      await this.stopDevices()
      await this.startDevices()
    }
    
    await this.logInfo("Configuration reloaded", {
      deviceCount: this.config.devices.length,
    })
  }

  protected getPublicFields(): Record<string, any> {
    return {
      enabled: this.enabled,
      isRunning: this.isRunning,
      config: this.config,
      deviceCount: this.devices.size,
      activeDevices: Array.from(this.devices.values()).filter(d => d.isConnected).length,
      devices: Array.from(this.devices.entries()).map(([code, state]) => ({
        deviceCode: code,
        isConnected: state.isConnected,
        batteryLevel: state.batteryLevel,
        lastPing: state.lastPing?.toISOString(),
        lastNotification: state.lastNotification?.toISOString(),
      })),
    }
  }

  protected async updatePublicFields(fields: Record<string, any>): Promise<void> {
    if (fields.config) {
      await this.reload(fields.config)
    }
    
    await this.updatePublicFieldsInDb(this.getPublicFields())
  }
}

export default DeviceEmulatorService