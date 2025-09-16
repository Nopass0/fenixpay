# 🔌 API Reference для сервисов

## BaseService API

### Constructor

```typescript
constructor(config?: ServiceConfig)
```

**ServiceConfig:**
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

### Abstract Methods

```typescript
// Основная логика сервиса (обязательно для реализации)
protected abstract tick(): Promise<void>
```

### Lifecycle Methods

```typescript
// Вызывается один раз при запуске сервиса
protected async onStart(): Promise<void>

// Запускает сервис
async start(): Promise<void>

// Останавливает сервис  
async stop(): Promise<void>

// Получить статус сервиса
status(): ServiceStatus
```

### Logging Methods

```typescript
// Логирование с разными уровнями
protected async logDebug(message: string, data?: any): Promise<void>
protected async logInfo(message: string, data?: any): Promise<void>
protected async logWarn(message: string, data?: any): Promise<void>
protected async logError(message: string, data?: any): Promise<void>

// Массовое логирование
protected async logMany(entries: ServiceLogEntry[]): Promise<void>

// Обычное логирование
protected async log(level: LogLevel, message: string, data?: any): Promise<void>
```

**ServiceLogEntry:**
```typescript
interface ServiceLogEntry {
  level: LogLevel;
  message: string;
  data?: any;
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
```

### Settings Management

```typescript
// Получить настройку
protected getSetting<T = any>(key: string, defaultValue?: T): T

// Установить настройку
protected async setSetting(key: string, value: any): Promise<void>

// Получить конфигурацию сервиса
protected getServiceConfig(): ServiceConfig

// Получить публичные поля (переопределяется в наследниках)
protected getPublicFields(): Record<string, any>

// Обработать изменения публичных полей из админки  
protected async updatePublicFields(fields: Record<string, any>): Promise<void>

// Обновить публичные поля в БД
async updatePublicFieldsInDb(fields: Record<string, any>): Promise<void>
```

### Inter-service Communication

```typescript
// Вызвать метод другого сервиса
protected async callService(serviceName: string, method: string, ...args: any[]): Promise<any>

// Получить список всех сервисов
protected async getAllServices(): Promise<string[]>

// Получить статус другого сервиса
protected async getServiceStatus(serviceName: string): Promise<any>
```

### Custom Endpoints

```typescript
// Добавить пользовательский эндпоинт
protected addEndpoint(endpoint: ServiceEndpoint): void

// Получить список эндпоинтов
protected getEndpoints(): ServiceEndpoint[]

// Получить Elysia приложение для эндпоинтов
getApp(): Elysia | null

// Создать приложение для эндпоинтов (вызывается автоматически)
protected createEndpointsApp(): Elysia
```

**ServiceEndpoint:**
```typescript
interface ServiceEndpoint {
  path: string;                                    // URL путь
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; // HTTP метод
  handler: (context: any) => any;                 // Обработчик запроса
  schema?: any;                                   // Elysia схема валидации
  description?: string;                           // Описание для документации
  tags?: string[];                               // Теги для группировки
}
```

### Service Properties

```typescript
// Защищенные свойства (доступны в наследниках)
protected interval: number;           // Интервал между вызовами tick()
protected displayName: string;        // Отображаемое имя
protected description?: string;       // Описание сервиса
protected autoStart: boolean;         // Автозапуск при старте приложения
protected enabledByDefault: boolean;  // Включен ли по умолчанию
protected tags: string[];            // Теги сервиса
protected customSettings: Record<string, any>; // Пользовательские настройки
protected endpoints: ServiceEndpoint[];        // Пользовательские эндпоинты

// Приватные свойства (только чтение через методы)
private running: boolean;             // Запущен ли сервис
private lastError: Error | null;      // Последняя ошибка
private lastTick: number;            // Время последнего вызова tick()
private serviceId?: string;          // ID в базе данных
private errorCount: number;          // Количество ошибок
```

### Service Management API

```typescript
// Обновить настройки сервиса
async updateSettings(settings: { interval?: number; enabled?: boolean }): Promise<void>

// Получить ID сервиса в БД
getServiceId(): string | undefined
```

## Admin API Endpoints

### Service Management

```http
GET /admin/services/list
```
Получить список всех сервисов с пагинацией.

**Query Parameters:**
- `page?: number` - номер страницы (по умолчанию 1)
- `limit?: number` - количество на странице (по умолчанию 20)

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "name": "string", 
      "displayName": "string",
      "description": "string",
      "status": "RUNNING" | "STOPPED" | "ERROR",
      "interval": "number",
      "enabled": "boolean",
      "lastTick": "string",
      "lastError": "string",
      "errorCount": "number",
      "publicFields": "object",
      "createdAt": "string",
      "updatedAt": "string",
      "_count": { "logs": "number" }
    }
  ],
  "meta": {
    "total": "number",
    "page": "number", 
    "limit": "number",
    "totalPages": "number"
  }
}
```

---

```http
GET /admin/services/{name}
```
Получить информацию о конкретном сервисе.

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "displayName": "string", 
  "description": "string",
  "status": "RUNNING" | "STOPPED" | "ERROR",
  "interval": "number",
  "enabled": "boolean",
  "lastTick": "string",
  "lastError": "string", 
  "errorCount": "number",
  "publicFields": "object",
  "createdAt": "string",
  "updatedAt": "string",
  "runtimeStatus": "object"
}
```

---

```http
POST /admin/services/{name}/start
```
Запустить сервис.

**Response:**
```json
{
  "success": "boolean",
  "message": "string"
}
```

---

```http
POST /admin/services/{name}/stop  
```
Остановить сервис.

**Response:**
```json
{
  "success": "boolean",
  "message": "string"
}
```

---

```http
PATCH /admin/services/{name}/settings
```
Обновить настройки сервиса.

**Body:**
```json
{
  "interval": "number",
  "enabled": "boolean"
}
```

**Response:**
```json
{
  "success": "boolean", 
  "message": "string"
}
```

---

```http
PATCH /admin/services/{name}/public-fields
```
Обновить публичные поля сервиса.

**Body:**
```json
{
  "fields": "object"
}
```

**Response:**
```json
{
  "success": "boolean",
  "message": "string" 
}
```

### Service Logs

```http
GET /admin/services/{name}/logs
```
Получить логи сервиса с фильтрацией.

**Query Parameters:**
- `page?: number` - номер страницы
- `limit?: number` - количество записей  
- `level?: string` - фильтр по уровню (DEBUG, INFO, WARN, ERROR)
- `search?: string` - поиск по тексту
- `dateFrom?: string` - дата начала (ISO string)
- `dateTo?: string` - дата окончания (ISO string)

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "level": "DEBUG" | "INFO" | "WARN" | "ERROR", 
      "message": "string",
      "data": "string",
      "createdAt": "string"
    }
  ],
  "meta": {
    "total": "number",
    "page": "number",
    "limit": "number", 
    "totalPages": "number"
  }
}
```

---

```http
DELETE /admin/services/{name}/logs
```
Очистить логи сервиса.

**Query Parameters:**
- `olderThan?: string` - удалить записи старше указанной даты

**Response:**
```json
{
  "success": "boolean",
  "message": "string"
}
```

### Service Statistics

```http
GET /admin/services/stats/overview
```
Получить общую статистику по сервисам.

**Response:**
```json
{
  "total": "number",
  "running": "number", 
  "stopped": "number",
  "error": "number",
  "totalLogs": "number",
  "services": [
    {
      "name": "string",
      "displayName": "string",
      "status": "string",
      "lastTick": "string",
      "errorCount": "number", 
      "logCount": "number"
    }
  ]
}
```

## Service Endpoints

Каждый сервис может создавать свои эндпоинты, которые будут доступны по адресу:

```
/api/service/{servicename}/{endpoint_path}
```

### Auto-generated Endpoints

Каждый сервис автоматически получает базовые эндпоинты:

```http
GET /api/service/{name}/status
```
Получить статус сервиса.

---

```http
GET /api/service/{name}/settings
```
Получить настройки сервиса.

---

```http
POST /api/service/{name}/settings
```
Обновить настройки сервиса.

## Types Reference

### ServiceStatus

```typescript
interface ServiceStatus {
  name: string;
  displayName: string;
  healthy: boolean;
  lastTick: string;
  lastError: string | null;
  errorCount: number;
  interval: number;
  publicFields: Record<string, any>;
  customSettings: Record<string, any>;
  endpoints: number;
  tags: string[];
}
```

### Database Models

```prisma
model Service {
  id              String        @id @default(cuid())
  name            String        @unique
  displayName     String
  description     String?
  status          ServiceStatus @default(STOPPED)
  interval        Int           @default(5000)
  enabled         Boolean       @default(true)
  lastTick        DateTime?
  lastError       String?
  errorCount      Int           @default(0)
  publicFields    Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  logs ServiceLog[]
}

model ServiceLog {
  id        String    @id @default(cuid())
  service   Service   @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  serviceId String
  level     LogLevel  @default(INFO)
  message   String
  data      Json?
  createdAt DateTime  @default(now())
  
  @@index([serviceId, createdAt(sort: Desc)])
}

enum ServiceStatus {
  RUNNING
  STOPPED
  ERROR
}

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
}
```

## Error Handling

Все методы API возвращают стандартные HTTP коды ошибок:

- `200` - Успех
- `400` - Неверные параметры запроса
- `404` - Сервис не найден
- `500` - Внутренняя ошибка сервера

Формат ошибки:
```json
{
  "error": "string",
  "details": "object"
}
```

## Example Usage

### Creating a Custom Service

```typescript
import { BaseService } from './BaseService';
import { t } from 'elysia';

export default class MyApiService extends BaseService {
  constructor() {
    super({
      displayName: 'My API Service',
      description: 'Service with custom endpoints',
      autoStart: true,
      tags: ['api', 'custom'],
    });

    this.registerEndpoints();
  }

  private registerEndpoints(): void {
    this.addEndpoint({
      path: '/hello',
      method: 'GET', 
      handler: ({ query }: any) => ({
        message: `Hello, ${query.name || 'World'}!`,
        timestamp: new Date().toISOString(),
      }),
      description: 'Say hello',
      tags: ['greeting'],
    });

    this.addEndpoint({
      path: '/data',
      method: 'POST',
      handler: async ({ body }: any) => {
        await this.logInfo('Data received', body);
        return { success: true, received: body };
      },
      schema: {
        body: t.Object({
          message: t.String(),
          priority: t.Optional(t.Number()),
        }),
      },
      description: 'Submit data',
      tags: ['data'],
    });
  }

  protected async tick(): Promise<void> {
    await this.logDebug('Periodic task executed');
  }

  protected getPublicFields(): Record<string, any> {
    return {
      endpointCount: this.endpoints.length,
      uptime: process.uptime(),
    };
  }

  // Public method for other services
  public async processExternalData(data: any): Promise<any> {
    await this.logInfo('Processing external data', { data });
    return { processed: true, result: data };
  }
}
```

### Using from Another Service

```typescript
export default class ConsumerService extends BaseService {
  protected async tick(): Promise<void> {
    try {
      // Call another service
      const result = await this.callService(
        'MyApiService', 
        'processExternalData', 
        { test: 'data' }
      );
      
      await this.logInfo('External service call result', { result });
    } catch (error) {
      await this.logError('Failed to call external service', { error });
    }
  }
}
```

---

📖 **Смотрите также:**
- [README.md](./README.md) - Полное руководство по созданию сервисов
- [ExampleService.ts](../ExampleService.ts) - Простой пример
- [AdvancedExampleService.ts](../AdvancedExampleService.ts) - Продвинутый пример