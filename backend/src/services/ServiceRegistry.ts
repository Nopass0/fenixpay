// src/services/ServiceRegistry.ts
import { BaseService } from './BaseService';
import { db } from '../db';

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, BaseService> = new Map();
  private static staticServices: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }
  
  /**
   * Статический метод для регистрации сервисов
   */
  static register(name: string, service: any): void {
    ServiceRegistry.staticServices.set(name, service);
  }
  
  /**
   * Статический метод для получения сервисов
   */
  static get<T = any>(name: string): T {
    const service = ServiceRegistry.staticServices.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found in static registry`);
    }
    return service as T;
  }

  /**
   * Регистрирует сервис в реестре
   */
  register(service: BaseService): void {
    const name = service.constructor.name;
    this.services.set(name, service);
    console.log(`Service ${name} registered`);
  }

  /**
   * Запускает сервис по имени
   */
  async startService(name: string): Promise<boolean> {
    const service = this.services.get(name);
    if (!service) {
      console.error(`Service ${name} not found`);
      return false;
    }

    try {
      // Запускаем сервис в отдельном потоке
      service.start().catch(error => {
        console.error(`Service ${name} crashed:`, error);
      });
      return true;
    } catch (error) {
      console.error(`Failed to start service ${name}:`, error);
      return false;
    }
  }

  /**
   * Останавливает сервис по имени
   */
  async stopService(name: string): Promise<boolean> {
    const service = this.services.get(name);
    if (!service) {
      console.error(`Service ${name} not found`);
      return false;
    }

    try {
      await service.stop();
      return true;
    } catch (error) {
      console.error(`Failed to stop service ${name}:`, error);
      return false;
    }
  }

  /**
   * Получает статус сервиса
   */
  getServiceStatus(name: string): any {
    const service = this.services.get(name);
    if (!service) {
      return null;
    }
    return service.status();
  }

  /**
   * Получает список всех зарегистрированных сервисов
   */
  listServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Получает все статусы сервисов
   */
  getAllStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    for (const [name, service] of this.services) {
      statuses[name] = service.status();
    }
    return statuses;
  }

  /**
   * Получает сервис по имени
   */
  getService(name: string): BaseService | undefined {
    return this.services.get(name);
  }
  
  /**
   * Получает сервис по имени (типизированный)
   */
  get<T extends BaseService>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found in registry`);
    }
    return service as T;
  }

  /**
   * Обновляет настройки сервиса
   */
  async updateServiceSettings(name: string, settings: { interval?: number; enabled?: boolean; maxLogs?: number }): Promise<boolean> {
    const service = this.services.get(name);
    if (!service) {
      return false;
    }

    try {
      await service.updateSettings(settings);
      return true;
    } catch (error) {
      console.error(`Failed to update service ${name} settings:`, error);
      return false;
    }
  }

  /**
   * Обновляет публичные поля сервиса
   */
  async updateServicePublicFields(name: string, fields: Record<string, any>): Promise<boolean> {
    const service = this.services.get(name);
    if (!service) {
      return false;
    }

    try {
      await service.updatePublicFieldsInDb(fields);
      return true;
    } catch (error) {
      console.error(`Failed to update service ${name} public fields:`, error);
      return false;
    }
  }

  /**
   * Получает логи сервиса из базы данных
   */
  async getServiceLogs(name: string, options: {
    page?: number;
    limit?: number;
    level?: string;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): Promise<{ logs: any[]; total: number }> {
    const { page = 1, limit = 50, level, search, dateFrom, dateTo } = options;

    try {
      const service = await db.service.findUnique({
        where: { name },
      });

      if (!service) {
        return { logs: [], total: 0 };
      }

      const where: any = {
        serviceId: service.id,
        ...(level && { level }),
        ...(search && {
          OR: [
            { message: { contains: search, mode: 'insensitive' } },
            { data: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(dateFrom && { createdAt: { gte: dateFrom } }),
        ...(dateTo && { createdAt: { lte: dateTo } }),
      };

      const [logs, total] = await Promise.all([
        db.serviceLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.serviceLog.count({ where }),
      ]);

      return { logs, total };
    } catch (error) {
      console.error(`Failed to get logs for service ${name}:`, error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Получает сервис из базы данных
   */
  async getServiceFromDb(name: string): Promise<any> {
    try {
      return await db.service.findUnique({
        where: { name },
        include: {
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    } catch (error) {
      console.error(`Failed to get service ${name} from database:`, error);
      return null;
    }
  }

  /**
   * Получает все сервисы из базы данных
   */
  async getAllServicesFromDb(): Promise<any[]> {
    try {
      return await db.service.findMany({
        include: {
          _count: {
            select: { logs: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Failed to get all services from database:', error);
      return [];
    }
  }
}

// Экспортируем singleton instance
export const serviceRegistry = ServiceRegistry.getInstance();