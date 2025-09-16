# 📖 Руководство по созданию сервисов

Эта документация описывает, как создавать и настраивать сервисы в системе.

## 📚 Содержание

- [Основы](#основы)
- [Создание сервиса](#создание-сервиса)
- [Конфигурация сервиса](#конфигурация-сервиса)
- [Логирование](#логирование)
- [Пользовательские эндпоинты](#пользовательские-эндпоинты)
- [Межсервисное взаимодействие](#межсервисное-взаимодействие)
- [Настройки и публичные поля](#настройки-и-публичные-поля)
- [API Reference](#api-reference)
- [Примеры](#примеры)

## Основы

Все сервисы наследуются от базового класса `BaseService`, который предоставляет:

- 🔄 Автоматический жизненный цикл (запуск/остановка)
- 📝 Структурированное логирование с сохранением в БД
- ⚙️ Управление настройками и публичными полями
- 🌐 Создание пользовательских API эндпоинтов
- 🔗 Межсервисное взаимодействие
- 📊 Мониторинг и статистика
- 🎛️ Управление через админ-панель

## Создание сервиса

### Базовый шаблон

```typescript
// src/services/MyService.ts
import { BaseService, ServiceConfig } from './BaseService';

export default class MyService extends BaseService {
  protected interval = 10_000; // 10 секунд

  constructor() {
    super({
      displayName: 'Мой сервис',
      description: 'Описание того, что делает сервис',
      enabled: true,
      autoStart: true,
      tags: ['category', 'feature'],
    });
  }

  protected async onStart(): Promise<void> {
    // Инициализация при запуске
    await this.logInfo('Service starting');
  }

  protected async tick(): Promise<void> {
    // Основная логика, выполняется каждые interval мс
    await this.logInfo('Performing work');
  }
}
```

### Авто-регистрация

Сервисы автоматически обнаруживаются и регистрируются при запуске приложения. Просто поместите файл в папку `src/services/` и экспортируйте класс как `default`.

## Конфигурация сервиса

### ServiceConfig

```typescript
interface ServiceConfig {
  displayName?: string;    // Отображаемое имя в админке
  description?: string;    // Описание сервиса
  enabled?: boolean;       // Включен ли по умолчанию
  interval?: number;       // Интервал в миллисекундах
  autoStart?: boolean;     // Автозапуск при старте приложения
  tags?: string[];        // Теги для категоризации
}
```

### Пример конфигурации

```typescript
constructor() {
  super({
    displayName: 'Очистка файлов',
    description: 'Автоматически удаляет старые временные файлы',
    enabled: true,
    autoStart: false,  // Запускать только вручную
    interval: 3600000, // 1 час
    tags: ['cleanup', 'maintenance', 'storage'],
  });
}
```

## Логирование

### Уровни логирования

```typescript
await this.logDebug('Отладочная информация', { details: 'data' });
await this.logInfo('Информационное сообщение', { count: 5 });
await this.logWarn('Предупреждение', { reason: 'low memory' });
await this.logError('Ошибка', { error: error.message });
```

### Массовое логирование

```typescript
await this.logMany([
  {
    level: 'INFO',
    message: 'Batch operation started',
    data: { batchSize: 100 }
  },
  {
    level: 'DEBUG',
    message: 'Processing item',
    data: { itemId: 1 }
  }
]);
```

### Просмотр логов

Логи доступны в админ-панели по адресу `/admin/services/{ServiceName}` во вкладке "Логи" с возможностью:
- Фильтрации по уровню
- Поиска по тексту
- Фильтрации по дате
- Просмотра JSON данных

## Пользовательские эндпоинты

### Добавление эндпоинтов

```typescript
constructor() {
  super(config);
  this.registerEndpoints();
}

private registerEndpoints(): void {
  // GET эндпоинт
  this.addEndpoint({
    path: '/status',
    method: 'GET',
    handler: () => ({ status: 'running', tasks: this.taskCount }),
    description: 'Получить статус сервиса',
    tags: ['status'],
  });

  // POST эндпоинт с валидацией
  this.addEndpoint({
    path: '/tasks',
    method: 'POST',
    handler: async ({ body }: any) => {
      const { name, priority } = body;
      // Логика создания задачи
      return { success: true, taskId: this.createTask(name, priority) };
    },
    schema: {
      body: t.Object({
        name: t.String(),
        priority: t.Optional(t.Union([
          t.Literal('low'), 
          t.Literal('normal'), 
          t.Literal('high')
        ])),
      }),
    },
    description: 'Создать новую задачу',
    tags: ['tasks'],
  });
}
```

### Доступ к эндпоинтам

Эндпоинты доступны по адресу: `/api/service/{servicename}/{path}`

Например: `/api/service/myservice/tasks`

### Автоматические эндпоинты

Каждый сервис автоматически получает базовые эндпоинты:
- `GET /api/service/{name}/status` - статус сервиса
- `GET /api/service/{name}/settings` - настройки сервиса
- `POST /api/service/{name}/settings` - обновление настроек

## Межсервисное взаимодействие

### Вызов методов других сервисов

```typescript
// Вызов публичного метода другого сервиса
const result = await this.callService('AdvancedExampleService', 'addTask', 'Test Task', 'high');

// Получение статуса другого сервиса
const status = await this.getServiceStatus('ExpiredTransactionWatcher');

// Получение списка всех сервисов
const services = await this.getAllServices();
```

### Публичные методы

Чтобы метод был доступен для вызова из других сервисов, объявите его как `public`:

```typescript
export default class MyService extends BaseService {
  // Публичный метод для внешних вызовов
  public async processData(data: any): Promise<any> {
    await this.logInfo('Processing external data', { data });
    // Логика обработки
    return result;
  }

  // Приватный метод - не доступен извне
  private async internalMethod(): Promise<void> {
    // Внутренняя логика
  }
}
```

## Настройки и публичные поля

### Пользовательские настройки

```typescript
constructor() {
  super(config);
  
  // Установка начальных настроек
  this.customSettings = {
    maxRetries: 3,
    timeoutMs: 5000,
    enableFeatureX: true,
  };
}

// Использование настроек
protected async tick(): Promise<void> {
  const maxRetries = this.getSetting('maxRetries', 3);
  const timeout = this.getSetting('timeoutMs', 5000);
  
  // Логика с использованием настроек
}

// Обновление настроек
await this.setSetting('maxRetries', 5);
```

### Публичные поля

```typescript
protected getPublicFields(): Record<string, any> {
  return {
    processedCount: this.processedCount,
    lastProcessTime: this.lastProcessTime,
    isActive: this.isActive,
    customSettings: this.customSettings,
    // Другие поля для отображения в админке
  };
}

// Обработка изменений из админки
protected async updatePublicFields(fields: Record<string, any>): Promise<void> {
  if (fields.customSettings) {
    for (const [key, value] of Object.entries(fields.customSettings)) {
      await this.setSetting(key, value);
    }
  }
  
  if (fields.isActive !== undefined) {
    this.isActive = fields.isActive;
    await this.logInfo('Activity status changed', { isActive: this.isActive });
  }
  
  await this.updatePublicFieldsInDb(this.getPublicFields());
}
```

## API Reference

### BaseService Methods

#### Lifecycle Methods
- `onStart(): Promise<void>` - вызывается при запуске сервиса
- `tick(): Promise<void>` - основная логика (abstract)
- `start(): Promise<void>` - запускает сервис
- `stop(): Promise<void>` - останавливает сервис

#### Logging Methods
- `logDebug(message: string, data?: any): Promise<void>`
- `logInfo(message: string, data?: any): Promise<void>`
- `logWarn(message: string, data?: any): Promise<void>`
- `logError(message: string, data?: any): Promise<void>`
- `logMany(entries: ServiceLogEntry[]): Promise<void>`

#### Settings Methods
- `getSetting<T>(key: string, defaultValue?: T): T`
- `setSetting(key: string, value: any): Promise<void>`

#### Inter-service Methods
- `callService(serviceName: string, method: string, ...args: any[]): Promise<any>`
- `getAllServices(): Promise<string[]>`
- `getServiceStatus(serviceName: string): Promise<any>`

#### Endpoint Methods
- `addEndpoint(endpoint: ServiceEndpoint): void`
- `getEndpoints(): ServiceEndpoint[]`
- `getApp(): Elysia | null`

#### Configuration Methods
- `getPublicFields(): Record<string, any>`
- `updatePublicFields(fields: Record<string, any>): Promise<void>`
- `getServiceConfig(): ServiceConfig`

### Types

```typescript
interface ServiceLogEntry {
  level: LogLevel;
  message: string;
  data?: any;
}

interface ServiceEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: (context: any) => any;
  schema?: any;
  description?: string;
  tags?: string[];
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
```

## Примеры

### Простой сервис мониторинга

```typescript
import { BaseService } from './BaseService';
import { db } from '../db';

export default class HealthMonitorService extends BaseService {
  protected interval = 60_000; // 1 минута
  private lastCheckTime = new Date();
  private healthScore = 100;

  constructor() {
    super({
      displayName: 'Монитор здоровья системы',
      description: 'Отслеживает состояние системы и базы данных',
      enabled: true,
      autoStart: true,
      tags: ['monitoring', 'health', 'system'],
    });

    this.customSettings = {
      checkDatabase: true,
      checkMemory: true,
      alertThreshold: 80,
    };
  }

  protected async tick(): Promise<void> {
    this.lastCheckTime = new Date();
    let score = 100;

    if (this.getSetting('checkDatabase', true)) {
      score -= await this.checkDatabase();
    }

    if (this.getSetting('checkMemory', true)) {
      score -= await this.checkMemory();
    }

    this.healthScore = Math.max(0, score);

    await this.logInfo('Health check completed', {
      score: this.healthScore,
      timestamp: this.lastCheckTime,
    });

    const threshold = this.getSetting('alertThreshold', 80);
    if (this.healthScore < threshold) {
      await this.logWarn('System health below threshold', {
        score: this.healthScore,
        threshold,
      });
    }
  }

  private async checkDatabase(): Promise<number> {
    try {
      const start = Date.now();
      await db.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      if (responseTime > 1000) return 20; // Медленная БД
      if (responseTime > 500) return 10;  // Умеренно медленная БД
      return 0; // БД в порядке
    } catch (error) {
      await this.logError('Database check failed', { error });
      return 50; // Критическая ошибка БД
    }
  }

  private async checkMemory(): Promise<number> {
    const memory = process.memoryUsage();
    const usedMB = memory.heapUsed / 1024 / 1024;
    const totalMB = memory.heapTotal / 1024 / 1024;
    const usage = (usedMB / totalMB) * 100;

    if (usage > 90) return 30; // Критическое использование памяти
    if (usage > 70) return 15; // Высокое использование памяти
    if (usage > 50) return 5;  // Умеренное использование памяти
    return 0; // Память в порядке
  }

  protected getPublicFields(): Record<string, any> {
    return {
      healthScore: this.healthScore,
      lastCheckTime: this.lastCheckTime.toISOString(),
      memoryUsage: process.memoryUsage(),
      customSettings: this.customSettings,
    };
  }

  // Публичный метод для других сервисов
  public getHealthScore(): number {
    return this.healthScore;
  }
}
```

### Сервис с API эндпоинтами

```typescript
import { BaseService } from './BaseService';
import { t } from 'elysia';

export default class TaskManagerService extends BaseService {
  private tasks: Array<{ id: number; name: string; status: string }> = [];
  private nextId = 1;

  constructor() {
    super({
      displayName: 'Менеджер задач',
      description: 'Управление задачами через API',
      autoStart: true,
      tags: ['tasks', 'api'],
    });

    this.registerEndpoints();
  }

  private registerEndpoints(): void {
    // Получить все задачи
    this.addEndpoint({
      path: '/tasks',
      method: 'GET',
      handler: () => ({
        tasks: this.tasks,
        total: this.tasks.length,
      }),
      description: 'Получить список всех задач',
      tags: ['tasks'],
    });

    // Создать задачу
    this.addEndpoint({
      path: '/tasks',
      method: 'POST',
      handler: async ({ body }: any) => {
        const task = {
          id: this.nextId++,
          name: body.name,
          status: 'pending',
        };
        
        this.tasks.push(task);
        await this.logInfo('Task created', { task });
        
        return { success: true, task };
      },
      schema: {
        body: t.Object({
          name: t.String({ minLength: 1 }),
        }),
      },
      description: 'Создать новую задачу',
      tags: ['tasks'],
    });

    // Обновить статус задачи
    this.addEndpoint({
      path: '/tasks/:id/status',
      method: 'PATCH',
      handler: async ({ params, body }: any) => {
        const taskId = parseInt(params.id);
        const task = this.tasks.find(t => t.id === taskId);
        
        if (!task) {
          return { success: false, error: 'Task not found' };
        }
        
        task.status = body.status;
        await this.logInfo('Task status updated', { taskId, status: body.status });
        
        return { success: true, task };
      },
      schema: {
        body: t.Object({
          status: t.Union([
            t.Literal('pending'),
            t.Literal('running'),
            t.Literal('completed'),
            t.Literal('failed'),
          ]),
        }),
      },
      description: 'Обновить статус задачи',
      tags: ['tasks'],
    });
  }

  protected async tick(): Promise<void> {
    // Обработка pending задач
    const pendingTasks = this.tasks.filter(t => t.status === 'pending');
    
    for (const task of pendingTasks.slice(0, 3)) { // Обрабатываем по 3 задачи за раз
      task.status = 'running';
      
      // Симуляция обработки
      setTimeout(() => {
        task.status = Math.random() > 0.1 ? 'completed' : 'failed';
      }, 2000);
    }

    if (pendingTasks.length > 0) {
      await this.logInfo('Processing tasks', { 
        pending: pendingTasks.length,
        processing: Math.min(3, pendingTasks.length),
      });
    }
  }

  protected getPublicFields(): Record<string, any> {
    const statusCounts = this.tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTasks: this.tasks.length,
      statusCounts,
      nextId: this.nextId,
    };
  }

  // Публичный метод для других сервисов
  public async addTask(name: string): Promise<number> {
    const task = {
      id: this.nextId++,
      name,
      status: 'pending',
    };
    
    this.tasks.push(task);
    await this.logInfo('Task added via service call', { task });
    
    return task.id;
  }
}
```

## 🔧 Отладка и мониторинг

### Логи в админ-панели

1. Перейдите в `/admin/services`
2. Выберите ваш сервис
3. Во вкладке "Логи" вы можете:
   - Фильтровать по уровню (DEBUG, INFO, WARN, ERROR)
   - Искать по тексту
   - Фильтровать по дате
   - Просматривать JSON данные в удобном формате

### Настройка через админ-панель

1. Во вкладке "Поля" можно изменять публичные поля сервиса
2. Базовые настройки (интервал, включен/выключен) в основных настройках
3. Кнопки запуска/остановки сервиса

### Мониторинг производительности

Используйте встроенные метрики:

```typescript
protected async tick(): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Ваша логика
    
    const processingTime = Date.now() - startTime;
    await this.logDebug('Performance metrics', {
      processingTime,
      memoryUsage: process.memoryUsage(),
    });
  } catch (error) {
    await this.logError('Tick failed', { error, processingTime: Date.now() - startTime });
    throw error;
  }
}
```

## 📝 Лучшие практики

1. **Всегда логируйте важные события** с контекстными данными
2. **Используйте осмысленные названия** для сервисов и эндпоинтов
3. **Обрабатывайте ошибки** и логируйте их с деталями
4. **Настройки делайте конфигурируемыми** через customSettings
5. **Публичные методы документируйте** для межсервисного взаимодействия
6. **Используйте теги** для категоризации сервисов
7. **Тестируйте эндпоинты** через Swagger UI в `/api/docs`

## 🚀 Deployment

Сервисы автоматически запускаются при старте приложения. Для production:

1. Настройте `autoStart: false` для сервисов, требующих ручного управления
2. Используйте переменные окружения для конфигурации
3. Мониторьте логи через админ-панель
4. Настройте алерты на критические ошибки

---

**Больше примеров смотрите в файлах:**
- `ExampleService.ts` - базовый пример
- `AdvancedExampleService.ts` - продвинутый пример со всеми возможностями
- `ExpiredTransactionWatcher.ts` - реальный production сервис