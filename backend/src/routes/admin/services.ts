// src/routes/admin/services.ts
import { Elysia, t } from 'elysia';
import { serviceRegistry } from '../../services/ServiceRegistry';
import { db } from '../../db';

export const servicesRoutes = new Elysia()
  .onBeforeHandle(({ set }) => {
    // Ensure proper UTF-8 encoding for responses
    set.headers['Content-Type'] = 'application/json; charset=utf-8';
  })
  
  // Получить список всех сервисов
  .get('/list', async ({ query }) => {
    const { page = 1, limit = 20 } = query;
    
    try {
      const services = await serviceRegistry.getAllServicesFromDb();
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedServices = services.slice(startIndex, endIndex);
      
      return {
        data: paginatedServices,
        meta: {
          total: services.length,
          page,
          limit,
          totalPages: Math.ceil(services.length / limit),
        },
      };
    } catch (error) {
      console.error('Failed to get services list:', error);
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }
  }, {
    query: t.Object({
      page: t.Optional(t.Numeric()),
      limit: t.Optional(t.Numeric()),
    }),
  })
  
  // Получить информацию о конкретном сервисе
  .get('/:name', async ({ params: { name } }) => {
    try {
      const serviceFromDb = await serviceRegistry.getServiceFromDb(name);
      const runtimeStatus = serviceRegistry.getServiceStatus(name);
      
      if (!serviceFromDb) {
        return { error: 'Service not found' };
      }
      
      return {
        ...serviceFromDb,
        runtimeStatus,
      };
    } catch (error) {
      console.error(`Failed to get service ${name}:`, error);
      return { error: 'Failed to get service' };
    }
  }, {
    params: t.Object({
      name: t.String(),
    }),
  })
  
  // Запустить сервис
  .post('/:name/start', async ({ params: { name } }) => {
    try {
      const success = await serviceRegistry.startService(name);
      if (success) {
        return { success: true, message: `Service ${name} started` };
      } else {
        return { success: false, message: `Failed to start service ${name}` };
      }
    } catch (error) {
      console.error(`Failed to start service ${name}:`, error);
      return { success: false, message: 'Failed to start service' };
    }
  }, {
    params: t.Object({
      name: t.String(),
    }),
  })
  
  // Остановить сервис
  .post('/:name/stop', async ({ params: { name } }) => {
    try {
      const success = await serviceRegistry.stopService(name);
      if (success) {
        return { success: true, message: `Service ${name} stopped` };
      } else {
        return { success: false, message: `Failed to stop service ${name}` };
      }
    } catch (error) {
      console.error(`Failed to stop service ${name}:`, error);
      return { success: false, message: 'Failed to stop service' };
    }
  }, {
    params: t.Object({
      name: t.String(),
    }),
  })
  
  // Обновить настройки сервиса
  .patch('/:name/settings', async ({ params: { name }, body }) => {
    try {
      const success = await serviceRegistry.updateServiceSettings(name, body);
      if (success) {
        return { success: true, message: `Service ${name} settings updated` };
      } else {
        return { success: false, message: `Failed to update service ${name} settings` };
      }
    } catch (error) {
      console.error(`Failed to update service ${name} settings:`, error);
      return { success: false, message: 'Failed to update service settings' };
    }
  }, {
    params: t.Object({
      name: t.String(),
    }),
    body: t.Object({
      interval: t.Optional(t.Number()),
      enabled: t.Optional(t.Boolean()),
      maxLogs: t.Optional(t.Number()),
    }),
  })
  
  // Обновить публичные поля сервиса
  .patch('/:name/public-fields', async ({ params: { name }, body }) => {
    try {
      const success = await serviceRegistry.updateServicePublicFields(name, body.fields);
      if (success) {
        return { success: true, message: `Service ${name} public fields updated` };
      } else {
        return { success: false, message: `Failed to update service ${name} public fields` };
      }
    } catch (error) {
      console.error(`Failed to update service ${name} public fields:`, error);
      return { success: false, message: 'Failed to update service public fields' };
    }
  }, {
    params: t.Object({
      name: t.String(),
    }),
    body: t.Object({
      fields: t.Record(t.String(), t.Any()),
    }),
  })
  
  // Получить логи сервиса
  .get('/:name/logs', async ({ params: { name }, query }) => {
    const { 
      page = 1, 
      limit = 50, 
      level, 
      search, 
      dateFrom, 
      dateTo 
    } = query;
    
    try {
      const options = {
        page,
        limit,
        level,
        search,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };
      
      const { logs, total } = await serviceRegistry.getServiceLogs(name, options);
      
      return {
        data: logs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error(`Failed to get logs for service ${name}:`, error);
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }
  }, {
    params: t.Object({
      name: t.String(),
    }),
    query: t.Object({
      page: t.Optional(t.Numeric()),
      limit: t.Optional(t.Numeric()),
      level: t.Optional(t.String()),
      search: t.Optional(t.String()),
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
    }),
  })
  
  // Очистить логи сервиса
  .delete('/:name/logs', async ({ params: { name }, query }) => {
    const { olderThan } = query;
    
    try {
      const service = await db.service.findUnique({
        where: { name },
      });
      
      if (!service) {
        return { success: false, message: 'Service not found' };
      }
      
      const where: any = {
        serviceId: service.id,
        ...(olderThan && { createdAt: { lt: new Date(olderThan) } }),
      };
      
      const deletedCount = await db.serviceLog.deleteMany({
        where,
      });
      
      return { 
        success: true, 
        message: `Deleted ${deletedCount.count} log entries for service ${name}` 
      };
    } catch (error) {
      console.error(`Failed to clear logs for service ${name}:`, error);
      return { success: false, message: 'Failed to clear logs' };
    }
  }, {
    params: t.Object({
      name: t.String(),
    }),
    query: t.Object({
      olderThan: t.Optional(t.String()),
    }),
  })
  
  // Toggle device emulator service
  .post('/device-emulator/toggle', async ({ body }) => {
    try {
      const { enabled } = body;
      
      // Update service config in database
      await db.serviceConfig.upsert({
        where: { serviceKey: 'device_emulator' },
        create: {
          serviceKey: 'device_emulator',
          isEnabled: enabled,
          config: {
            global: {
              defaultPingSec: 60,
              defaultNotifyChance: 0.4,
              defaultSpamChance: 0.05,
              defaultDelayChance: 0.1,
              reconnectOnAuthError: true,
            },
            devices: []
          }
        },
        update: {
          isEnabled: enabled
        }
      });
      
      // Toggle the service
      if (enabled) {
        await serviceRegistry.startService('DeviceEmulatorService');
      } else {
        await serviceRegistry.stopService('DeviceEmulatorService');
      }
      
      return { success: true, enabled };
    } catch (error) {
      console.error('Failed to toggle device emulator:', error);
      return { success: false, error: 'Failed to toggle service' };
    }
  }, {
    body: t.Object({
      enabled: t.Boolean(),
    }),
  })
  
  // Получить статистику по сервисам
  .get('/stats/overview', async () => {
    try {
      const services = await db.service.findMany({
        include: {
          _count: {
            select: { logs: true },
          },
        },
      });
      
      const stats = {
        total: services.length,
        running: services.filter(s => s.status === 'RUNNING').length,
        stopped: services.filter(s => s.status === 'STOPPED').length,
        error: services.filter(s => s.status === 'ERROR').length,
        totalLogs: services.reduce((sum, s) => sum + s._count.logs, 0),
        services: services.map(s => ({
          name: s.name,
          displayName: s.displayName,
          status: s.status,
          lastTick: s.lastTick,
          errorCount: s.errorCount,
          logCount: s._count.logs,
        })),
      };
      
      return stats;
    } catch (error) {
      console.error('Failed to get services stats:', error);
      return {
        total: 0,
        running: 0,
        stopped: 0,
        error: 0,
        totalLogs: 0,
        services: [],
      };
    }
  })
  
  // Manually trigger payout redistribution
  .post('/redistribute-payouts', async ({ set }) => {
    try {
      const service = serviceRegistry.get('PayoutRedistributionService');
      
      if (!service) {
        set.status = 404;
        return { error: 'PayoutRedistributionService not found' };
      }
      
      // Check if service has the method
      if (typeof service.redistributePayouts !== 'function') {
        set.status = 500;
        return { error: 'redistributePayouts method not found on service' };
      }
      
      // Manually trigger redistribution
      await service.redistributePayouts();
      
      return {
        success: true,
        message: 'Payout redistribution triggered successfully'
      };
    } catch (error: any) {
      console.error('Error triggering payout redistribution:', error);
      set.status = 500;
      return { error: error.message || 'Internal server error' };
    }
  });