// src/services/BaseService.ts
import { db } from '../db';
import { Elysia } from 'elysia';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface ServiceLogEntry {
  level: LogLevel;
  message: string;
  data?: any;
}

export interface ServiceConfig {
  displayName?: string;
  description?: string;
  enabled?: boolean;
  interval?: number;
  autoStart?: boolean;
  tags?: string[];
}

export interface ServiceEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: (context: any) => any;
  schema?: any;
  description?: string;
  tags?: string[];
}

/**
 * Base service class that provides a common structure for background services.
 *
 * Наследники могут переопределить:
 *  • interval — период между tick-ами (мс)
 *  • tick()   — главное периодическое действие (обязательный abstract)
 *  • onStart() — опциональная инициализация, вызывается один раз при запуске
 *  • getPublicFields() — возвращает публичные поля сервиса
 *  • getServiceConfig() — возвращает конфигурацию сервиса
 *  • getEndpoints() — возвращает пользовательские эндпоинты
 */
export abstract class BaseService {
  /** Период между вызовами tick, мс (переопределяйте в наследниках) */
  protected interval = 5_000;

  /** Отображаемое имя сервиса */
  protected displayName: string;

  /** Описание сервиса */
  protected description?: string;

  /** Автоматически запускать при старте приложения */
  protected autoStart: boolean = true;

  /** Включен ли сервис по умолчанию */
  protected enabledByDefault: boolean = true;

  /** Теги для категоризации сервиса */
  protected tags: string[] = [];

  /** Пользовательские настройки сервиса */
  protected customSettings: Record<string, any> = {};

  /** Пользовательские эндпоинты */
  protected endpoints: ServiceEndpoint[] = [];

  /** Elysia app для пользовательских эндпоинтов */
  protected app?: Elysia;

  private running = false;
  private lastError: Error | null = null;
  private lastTick = 0;
  private serviceId?: string;
  private errorCount = 0;

  constructor(config?: ServiceConfig) {
    this.displayName = config?.displayName || this.constructor.name;
    this.description = config?.description || '';
    this.interval = config?.interval || this.interval;
    this.enabledByDefault = config?.enabled ?? this.enabledByDefault;
    this.autoStart = config?.autoStart ?? this.autoStart;
    this.tags = config?.tags || this.tags;
  }

  /** Основная единица работы (должна быть реализована в наследнике) */
  protected abstract tick(): Promise<void>;

  /** Опциональный хук, выполняемый однократно при запуске сервиса */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected async onStart(): Promise<void> {} // no-op по умолчанию

  /** Возвращает публичные поля сервиса для отображения в админке */
  protected getPublicFields(): Record<string, any> {
    return {};
  }

  /** Обновляет публичные поля сервиса */
  protected async updatePublicFields(fields: Record<string, any>): Promise<void> {
    // Реализация для обновления полей в наследниках
  }

  /** Возвращает конфигурацию сервиса */
  protected getServiceConfig(): ServiceConfig {
    return {
      displayName: this.displayName,
      description: this.description,
      enabled: this.enabledByDefault,
      interval: this.interval,
      autoStart: this.autoStart,
      tags: this.tags,
    };
  }

  /** Возвращает пользовательские эндпоинты */
  protected getEndpoints(): ServiceEndpoint[] {
    return this.endpoints;
  }

  /** Добавляет пользовательский эндпоинт */
  protected addEndpoint(endpoint: ServiceEndpoint): void {
    this.endpoints.push(endpoint);
  }

  /** Получает настройку сервиса */
  protected getSetting<T = any>(key: string, defaultValue?: T): T {
    return this.customSettings[key] ?? defaultValue;
  }

  /** Устанавливает настройку сервиса */
  protected async setSetting(key: string, value: any): Promise<void> {
    this.customSettings[key] = value;
    await this.updatePublicFieldsInDb(this.getPublicFields());
    await this.logDebug('Service setting updated', { key, value });
  }

  /** Обращается к другому сервису */
  protected async callService(serviceName: string, method: string, ...args: any[]): Promise<any> {
    const { serviceRegistry } = await import('./ServiceRegistry');
    const service = serviceRegistry.getService(serviceName);
    
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    if (typeof (service as any)[method] !== 'function') {
      throw new Error(`Method ${method} not found in service ${serviceName}`);
    }

    await this.logDebug('Calling service method', { 
      targetService: serviceName, 
      method, 
      args: args.length 
    });

    return (service as any)[method](...args);
  }

  /** Получает список всех сервисов */
  protected async getAllServices(): Promise<string[]> {
    const { serviceRegistry } = await import('./ServiceRegistry');
    return serviceRegistry.listServices();
  }

  /** Получает статус другого сервиса */
  protected async getServiceStatus(serviceName: string): Promise<any> {
    const { serviceRegistry } = await import('./ServiceRegistry');
    return serviceRegistry.getServiceStatus(serviceName);
  }

  /** Создает Elysia app для пользовательских эндпоинтов */
  protected createEndpointsApp(): Elysia {
    if (!this.app) {
      this.app = new Elysia({ prefix: `/service/${this.constructor.name.toLowerCase()}` });
      
      // Добавляем все пользовательские эндпоинты
      for (const endpoint of this.endpoints) {
        const method = endpoint.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
        
        if (endpoint.schema) {
          (this.app as any)[method](endpoint.path, endpoint.handler, endpoint.schema);
        } else {
          (this.app as any)[method](endpoint.path, endpoint.handler);
        }
      }

      // Добавляем базовые эндпоинты для всех сервисов
      this.app
        .get('/status', () => this.status(), {
          detail: {
            tags: ['service'],
            summary: `Get ${this.displayName} status`,
            description: `Returns current status and health information for ${this.displayName}`,
          }
        })
        .get('/settings', () => this.customSettings, {
          detail: {
            tags: ['service'],
            summary: `Get ${this.displayName} settings`,
            description: `Returns current custom settings for ${this.displayName}`,
          }
        })
        .post('/settings', async ({ body }: any) => {
          for (const [key, value] of Object.entries(body)) {
            await this.setSetting(key, value);
          }
          return { success: true, settings: this.customSettings };
        }, {
          detail: {
            tags: ['service'],
            summary: `Update ${this.displayName} settings`,
            description: `Updates custom settings for ${this.displayName}`,
          }
        });
    }
    
    return this.app;
  }

  /** Получает Elysia app для интеграции с основным приложением */
  getApp(): Elysia | null {
    if (this.endpoints.length > 0) {
      return this.createEndpointsApp();
    }
    return null;
  }

  /** Логирование с сохранением в базу данных */
  protected async log(level: LogLevel, message: string, data?: any): Promise<void> {
    try {
      if (this.serviceId) {
        await db.serviceLog.create({
          data: {
            serviceId: this.serviceId,
            level,
            message,
            data: data ? JSON.stringify(data) : null,
          },
        });
        
        // Очищаем старые логи если превышен лимит
        await this.cleanupOldLogs();
      }
      
      // Также выводим в консоль
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${this.constructor.name}] ${level}: ${message}`, data || '');
    } catch (error) {
      // If foreign key constraint violated, re-register the service
      if (error.code === 'P2003') {
        console.warn(`Service ${this.constructor.name} foreign key violation, re-registering...`);
        this.serviceId = undefined;
        await this.registerService();
      } else {
        console.error(`Failed to log message: ${error}`);
      }
    }
  }

  /** Массовое логирование */
  protected async logMany(entries: ServiceLogEntry[]): Promise<void> {
    try {
      if (this.serviceId && entries.length > 0) {
        await db.serviceLog.createMany({
          data: entries.map(entry => ({
            serviceId: this.serviceId!,
            level: entry.level,
            message: entry.message,
            data: entry.data ? JSON.stringify(entry.data) : null,
          })),
        });
      }
    } catch (error) {
      console.error(`Failed to log multiple messages: ${error}`);
    }
  }

  /** Логирование отладочной информации */
  protected async logDebug(message: string, data?: any): Promise<void> {
    await this.log('DEBUG', message, data);
  }

  /** Логирование информации */
  protected async logInfo(message: string, data?: any): Promise<void> {
    await this.log('INFO', message, data);
  }

  /** Логирование предупреждений */
  protected async logWarn(message: string, data?: any): Promise<void> {
    await this.log('WARN', message, data);
  }

  /** Логирование ошибок */
  protected async logError(message: string, data?: any): Promise<void> {
    await this.log('ERROR', message, data);
  }

  /** Регистрация сервиса в системе */
  private async registerService(): Promise<void> {
    try {
      const existingService = await db.service.findUnique({
        where: { name: this.constructor.name },
      });

      if (existingService) {
        this.serviceId = existingService.id;
        
        // Загружаем существующие настройки
        if (existingService.publicFields) {
          const savedFields = existingService.publicFields as Record<string, any>;
          if (savedFields.customSettings) {
            this.customSettings = { ...this.customSettings, ...savedFields.customSettings };
          }
        }
        
        await db.service.update({
          where: { id: this.serviceId },
          data: {
            displayName: this.displayName,
            description: this.description,
            interval: this.interval,
            status: 'RUNNING',
            lastTick: new Date(),
            lastError: null,
            errorCount: 0,
            publicFields: this.getExtendedPublicFields(),
          },
        });
      } else {
        const newService = await db.service.create({
          data: {
            name: this.constructor.name,
            displayName: this.displayName,
            description: this.description,
            interval: this.interval,
            status: 'RUNNING',
            enabled: this.enabledByDefault,
            publicFields: this.getExtendedPublicFields(),
          },
        });
        this.serviceId = newService.id;
      }
    } catch (error) {
      console.error(`Failed to register service ${this.constructor.name}:`, error);
    }
  }

  /** Обновление статуса сервиса */
  private async updateServiceStatus(status: 'RUNNING' | 'STOPPED' | 'ERROR'): Promise<void> {
    try {
      if (this.serviceId) {
        await db.service.update({
          where: { id: this.serviceId },
          data: {
            status,
            lastTick: status === 'RUNNING' ? new Date() : undefined,
            lastError: this.lastError?.message || null,
            errorCount: this.errorCount,
            publicFields: this.getExtendedPublicFields(),
          },
        });
      }
    } catch (error) {
      // If service record doesn't exist (P2025), re-register the service
      if (error.code === 'P2025') {
        console.warn(`Service ${this.constructor.name} not found in database, re-registering...`);
        this.serviceId = undefined;
        await this.registerService();
      } else {
        console.error(`Failed to update service status:`, error);
      }
    }
  }

  /** Public health-check accessor */
  status() {
    return {
      name: this.constructor.name,
      displayName: this.displayName,
      healthy: this.running && Date.now() - this.lastTick < this.interval * 2,
      lastTick: new Date(this.lastTick).toISOString(),
      lastError: this.lastError?.message ?? null,
      errorCount: this.errorCount,
      interval: this.interval,
      publicFields: this.getPublicFields(),
      customSettings: this.customSettings,
      endpoints: this.endpoints.length,
      tags: this.tags,
    };
  }

  /** Расширенные публичные поля с настройками */
  protected getExtendedPublicFields(): Record<string, any> {
    return {
      ...this.getPublicFields(),
      customSettings: this.customSettings,
      config: this.getServiceConfig(),
      endpoints: this.endpoints.map(ep => ({
        path: ep.path,
        method: ep.method,
        description: ep.description,
        tags: ep.tags,
      })),
    };
  }

  /** Запускает сервис и периодически вызывает tick() */
  async start(): Promise<void> {
    this.running = true;

    // Регистрируем сервис в системе
    await this.registerService();
    await this.logInfo('Service starting', { interval: this.interval });

    /* --- однократная инициализация --------------------------------------- */
    try {
      await this.onStart();
      await this.logInfo('Service initialized successfully');
    } catch (e) {
      this.lastError = e as Error;
      this.errorCount++;
      await this.logError('Service initialization failed', { error: e });
      await this.updateServiceStatus('ERROR');
    }

    /* --- основной цикл ---------------------------------------------------- */
    while (this.running) {
      try {
        await this.tick();
        this.lastTick = Date.now();
        this.lastError = null;
        await this.updateServiceStatus('RUNNING');
      } catch (e) {
        this.lastError = e as Error;
        this.errorCount++;
        await this.logError('Tick execution failed', { error: e });
        await this.updateServiceStatus('ERROR');
      }
      await Bun.sleep(this.interval);
    }
  }

  /** Останавливает выполнение сервиса */
  async stop(): Promise<void> {
    this.running = false;
    await this.logInfo('Service stopping');
    await this.updateServiceStatus('STOPPED');
  }

  /** Получает ID сервиса в базе данных */
  getServiceId(): string | undefined {
    return this.serviceId;
  }

  /** Обновляет настройки сервиса */
  async updateSettings(settings: { interval?: number; enabled?: boolean; maxLogs?: number }): Promise<void> {
    if (settings.interval !== undefined) {
      this.interval = settings.interval;
    }
    
    if (this.serviceId) {
      const updateData: any = {
        interval: this.interval,
      };
      
      if (settings.enabled !== undefined) {
        updateData.enabled = settings.enabled;
      }
      
      if (settings.maxLogs !== undefined) {
        updateData.maxLogs = settings.maxLogs;
      }
      
      await db.service.update({
        where: { id: this.serviceId },
        data: updateData,
      });
    }
    
    await this.logInfo('Service settings updated', settings);
  }

  /** Обновляет публичные поля сервиса в базе данных */
  async updatePublicFieldsInDb(fields: Record<string, any>): Promise<void> {
    if (this.serviceId) {
      await db.service.update({
        where: { id: this.serviceId },
        data: {
          publicFields: fields,
        },
      });
    }
  }

  /** Очищает старые логи если превышен лимит */
  private async cleanupOldLogs(): Promise<void> {
    try {
      if (!this.serviceId) return;

      // Получаем информацию о сервисе и количестве логов
      const service = await db.service.findUnique({
        where: { id: this.serviceId },
        include: {
          _count: {
            select: { logs: true }
          }
        }
      });

      if (!service) return;

      const logCount = service._count.logs;
      const maxLogs = service.maxLogs;

      // Если превышен лимит, удаляем самые старые записи
      if (logCount > maxLogs) {
        const logsToDelete = logCount - maxLogs;
        
        // Получаем ID самых старых логов для удаления
        const oldestLogs = await db.serviceLog.findMany({
          where: { serviceId: this.serviceId },
          orderBy: { createdAt: 'asc' },
          take: logsToDelete,
          select: { id: true }
        });

        if (oldestLogs.length > 0) {
          await db.serviceLog.deleteMany({
            where: {
              id: {
                in: oldestLogs.map(log => log.id)
              }
            }
          });
        }
      }
    } catch (error) {
      console.error(`Failed to cleanup old logs for service ${this.constructor.name}:`, error);
    }
  }
}
