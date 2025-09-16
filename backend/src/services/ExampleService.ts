// src/services/ExampleService.ts
import { BaseService } from './BaseService';

/**
 * ExampleService — демонстрирует работу нового BaseService с логированием
 */
export class ExampleService extends BaseService {
  protected interval = 15_000; // 15 секунд
  
  // Публичные поля сервиса
  private tickCount = 0;
  private lastProcessedTime = new Date();
  private enabled = true;
  private maxTickCount = 100;

  constructor() {
    super({
      displayName: 'Пример сервиса',
      description: 'Демонстрационный сервис для показа возможностей логирования и управления',
      enabled: false,
      autoStart: false,
      tags: ['example', 'demo', 'logging'],
    });
    
    this.customSettings = {
      enabled: true,
      maxTickCount: 100,
    };
  }

  /** Однократная инициализация */
  protected async onStart(): Promise<void> {
    await this.logInfo('Example Service initializing', { 
      interval: this.interval,
      maxTickCount: this.maxTickCount
    });
    
    // Симуляция инициализации
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.logInfo('Example Service initialized successfully');
  }

  /** Периодическое действие */
  protected async tick(): Promise<void> {
    if (!this.enabled) {
      await this.logDebug('Service is disabled, skipping tick');
      return;
    }

    this.tickCount++;
    this.lastProcessedTime = new Date();

    await this.logInfo(`Processing tick #${this.tickCount}`, {
      tickCount: this.tickCount,
      timestamp: this.lastProcessedTime.toISOString(),
      memoryUsage: process.memoryUsage()
    });

    // Симуляция работы
    if (this.tickCount % 5 === 0) {
      await this.logWarn('Periodic warning message', {
        tickCount: this.tickCount,
        message: 'This is a scheduled warning for demonstration'
      });
    }

    // Симуляция ошибки
    if (this.tickCount % 20 === 0) {
      await this.logError('Simulated error', {
        tickCount: this.tickCount,
        errorType: 'SIMULATION',
        details: 'This is a demonstration error'
      });
    }

    // Автостоп после maxTickCount
    if (this.tickCount >= this.maxTickCount) {
      await this.logWarn('Reached maximum tick count, disabling service', {
        maxTickCount: this.maxTickCount
      });
      this.enabled = false;
    }

    // Массовое логирование для демонстрации
    if (this.tickCount % 10 === 0) {
      await this.logMany([
        {
          level: 'INFO',
          message: 'Batch log entry 1',
          data: { batchId: 1, tickCount: this.tickCount }
        },
        {
          level: 'INFO', 
          message: 'Batch log entry 2',
          data: { batchId: 2, tickCount: this.tickCount }
        },
        {
          level: 'DEBUG',
          message: 'Batch debug entry',
          data: { batchId: 3, tickCount: this.tickCount }
        }
      ]);
    }
  }

  /** Возвращает публичные поля сервиса */
  protected getPublicFields(): Record<string, any> {
    return {
      tickCount: this.tickCount,
      lastProcessedTime: this.lastProcessedTime.toISOString(),
      enabled: this.enabled,
      maxTickCount: this.maxTickCount,
      uptime: process.uptime(),
      nodeVersion: process.version
    };
  }

  /** Обновляет публичные поля сервиса */
  protected async updatePublicFields(fields: Record<string, any>): Promise<void> {
    if (fields.enabled !== undefined) {
      this.enabled = fields.enabled;
      await this.logInfo('Service enabled status changed', { enabled: this.enabled });
    }
    
    if (fields.maxTickCount !== undefined) {
      this.maxTickCount = fields.maxTickCount;
      await this.logInfo('Max tick count updated', { maxTickCount: this.maxTickCount });
    }

    // Обновляем в базе данных
    await this.updatePublicFieldsInDb(this.getPublicFields());
  }
}
