// src/services/AdvancedExampleService.ts
import { BaseService, ServiceConfig, ServiceEndpoint } from './BaseService';
import { t } from 'elysia';

/**
 * AdvancedExampleService — продвинутый пример сервиса со всеми возможностями
 */
export default class AdvancedExampleService extends BaseService {
  protected interval = 30_000; // 30 секунд
  
  // Приватные поля сервиса
  private taskCount = 0;
  private lastResult: any = null;
  private isProcessing = false;
  private notifications: string[] = [];

  constructor() {
    super({
      displayName: 'Продвинутый пример сервиса',
      description: 'Демонстрация всех возможностей системы сервисов: настройки, эндпоинты, межсервисное взаимодействие',
      enabled: false,
      autoStart: false,
      tags: ['example', 'advanced', 'demo'],
    });

    // Устанавливаем начальные настройки
    this.customSettings = {
      maxTasks: 10,
      enableNotifications: true,
      processingMode: 'automatic',
      retryAttempts: 3,
    };

    // Регистрируем пользовательские эндпоинты
    this.registerEndpoints();
  }

  /** Регистрирует пользовательские эндпоинты */
  private registerEndpoints(): void {
    // Получить текущие задачи
    this.addEndpoint({
      path: '/tasks',
      method: 'GET',
      handler: () => ({
        taskCount: this.taskCount,
        isProcessing: this.isProcessing,
        lastResult: this.lastResult,
        settings: this.customSettings,
      }),
      description: 'Получить информацию о текущих задачах',
      tags: ['tasks'],
    });

    // Добавить новую задачу
    this.addEndpoint({
      path: '/tasks',
      method: 'POST',
      handler: async ({ body }: any) => {
        const { taskName, priority = 'normal' } = body;
        
        await this.logInfo('New task created via API', { taskName, priority });
        this.taskCount++;
        
        this.notifications.push(`New task: ${taskName} (${priority})`);
        
        return {
          success: true,
          taskId: this.taskCount,
          message: `Task "${taskName}" created successfully`,
        };
      },
      schema: {
        body: t.Object({
          taskName: t.String(),
          priority: t.Optional(t.Union([t.Literal('low'), t.Literal('normal'), t.Literal('high')])),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            taskId: t.Number(),
            message: t.String(),
          }),
        },
      },
      description: 'Создать новую задачу',
      tags: ['tasks'],
    });

    // Получить уведомления
    this.addEndpoint({
      path: '/notifications',
      method: 'GET',
      handler: () => ({
        notifications: this.notifications,
        count: this.notifications.length,
      }),
      description: 'Получить список уведомлений',
      tags: ['notifications'],
    });

    // Очистить уведомления
    this.addEndpoint({
      path: '/notifications',
      method: 'DELETE',
      handler: async () => {
        const clearedCount = this.notifications.length;
        this.notifications = [];
        
        await this.logInfo('Notifications cleared via API', { clearedCount });
        
        return {
          success: true,
          clearedCount,
          message: `Cleared ${clearedCount} notifications`,
        };
      },
      description: 'Очистить все уведомления',
      tags: ['notifications'],
    });

    // Выполнить обработку вручную
    this.addEndpoint({
      path: '/process',
      method: 'POST',
      handler: async ({ body }: any) => {
        const { force = false } = body || {};
        
        if (this.isProcessing && !force) {
          return {
            success: false,
            message: 'Processing is already in progress',
          };
        }

        await this.logInfo('Manual processing triggered via API', { force });
        
        try {
          await this.performProcessing();
          return {
            success: true,
            message: 'Processing completed successfully',
            result: this.lastResult,
          };
        } catch (error) {
          await this.logError('Manual processing failed', { error });
          return {
            success: false,
            message: 'Processing failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
      schema: {
        body: t.Optional(t.Object({
          force: t.Optional(t.Boolean()),
        })),
      },
      description: 'Запустить обработку вручную',
      tags: ['processing'],
    });

    // Получить статистику других сервисов
    this.addEndpoint({
      path: '/services-info',
      method: 'GET',
      handler: async () => {
        const services = await this.getAllServices();
        const servicesInfo = [];
        
        for (const serviceName of services) {
          try {
            const status = await this.getServiceStatus(serviceName);
            servicesInfo.push({
              name: serviceName,
              status: status?.healthy ? 'healthy' : 'unhealthy',
              lastTick: status?.lastTick,
              errors: status?.errorCount || 0,
            });
          } catch (error) {
            servicesInfo.push({
              name: serviceName,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        
        return {
          totalServices: services.length,
          services: servicesInfo,
        };
      },
      description: 'Получить информацию о всех сервисах',
      tags: ['services'],
    });
  }

  /** Инициализация сервиса */
  protected async onStart(): Promise<void> {
    await this.logInfo('Advanced Example Service starting', {
      settings: this.customSettings,
      endpoints: this.endpoints.length,
    });

    // Пример загрузки начальных данных
    await this.loadInitialData();
  }

  /** Загрузка начальных данных */
  private async loadInitialData(): Promise<void> {
    await this.logInfo('Loading initial data');
    
    // Симуляция загрузки данных
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.notifications.push('Service initialized');
    await this.logInfo('Initial data loaded successfully');
  }

  /** Основное действие сервиса */
  protected async tick(): Promise<void> {
    const processingMode = this.getSetting('processingMode', 'automatic');
    
    if (processingMode !== 'automatic') {
      await this.logDebug('Automatic processing disabled');
      return;
    }

    await this.performProcessing();
  }

  /** Выполнение обработки */
  private async performProcessing(): Promise<void> {
    if (this.isProcessing) {
      await this.logWarn('Processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      await this.logInfo('Starting processing cycle', {
        taskCount: this.taskCount,
        settings: this.customSettings,
      });

      // Симуляция работы
      const processingTime = Math.random() * 3000 + 1000; // 1-4 секунды
      await new Promise(resolve => setTimeout(resolve, processingTime));

      // Пример межсервисного взаимодействия
      try {
        const expiredWatcherStatus = await this.getServiceStatus('ExpiredTransactionWatcher');
        await this.logDebug('Checked ExpiredTransactionWatcher status', {
          healthy: expiredWatcherStatus?.healthy,
          lastTick: expiredWatcherStatus?.lastTick,
        });
      } catch (error) {
        await this.logWarn('Could not get ExpiredTransactionWatcher status', { error });
      }

      const maxTasks = this.getSetting('maxTasks', 10);
      const enableNotifications = this.getSetting('enableNotifications', true);

      // Обработка задач
      const processedTasks = Math.min(this.taskCount, maxTasks);
      this.taskCount = Math.max(0, this.taskCount - processedTasks);

      this.lastResult = {
        processedTasks,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        remainingTasks: this.taskCount,
      };

      if (enableNotifications && processedTasks > 0) {
        this.notifications.push(`Processed ${processedTasks} tasks`);
      }

      await this.logInfo('Processing cycle completed', {
        ...this.lastResult,
        memoryUsage: process.memoryUsage(),
      });

      // Массовое логирование для аналитики
      if (processedTasks > 0) {
        await this.logMany([
          {
            level: 'INFO',
            message: 'Task processing metrics',
            data: {
              processedTasks,
              efficiency: processedTasks / (processingTime / 1000),
              queueSize: this.taskCount,
            }
          },
          {
            level: 'DEBUG',
            message: 'System metrics',
            data: {
              memory: process.memoryUsage(),
              uptime: process.uptime(),
              nodeVersion: process.version,
            }
          }
        ]);
      }

    } catch (error) {
      this.lastResult = {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };

      await this.logError('Processing cycle failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime: Date.now() - startTime,
      });

      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /** Возвращает публичные поля сервиса */
  protected getPublicFields(): Record<string, any> {
    return {
      taskCount: this.taskCount,
      isProcessing: this.isProcessing,
      lastResult: this.lastResult,
      notificationCount: this.notifications.length,
      customSettings: this.customSettings,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /** Обновляет публичные поля сервиса */
  protected async updatePublicFields(fields: Record<string, any>): Promise<void> {
    // Обновляем пользовательские настройки
    if (fields.customSettings) {
      for (const [key, value] of Object.entries(fields.customSettings)) {
        await this.setSetting(key, value);
      }
    }

    // Обновляем состояние задач
    if (fields.taskCount !== undefined) {
      this.taskCount = Math.max(0, Number(fields.taskCount));
      await this.logInfo('Task count updated via admin panel', { newCount: this.taskCount });
    }

    // Обновляем в базе данных
    await this.updatePublicFieldsInDb(this.getPublicFields());
  }

  /** Публичный метод для вызова из других сервисов */
  public async addTask(taskName: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<number> {
    this.taskCount++;
    this.notifications.push(`External task: ${taskName} (${priority})`);
    
    await this.logInfo('Task added via service call', { taskName, priority, caller: 'external' });
    
    return this.taskCount;
  }

  /** Публичный метод для получения статистики */
  public getStats(): any {
    return {
      taskCount: this.taskCount,
      isProcessing: this.isProcessing,
      lastResult: this.lastResult,
      notifications: this.notifications.length,
      settings: this.customSettings,
    };
  }
}