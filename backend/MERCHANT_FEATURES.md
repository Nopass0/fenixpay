# Merchant Features Documentation

## Изменения в системе

### 1. Исправления в создании методов платежа

#### Изменения в `/src/routes/admin/merchant/methods.ts`:
- **Удалено поле выбора валюты** - теперь всегда используется USDT
- Валюта автоматически устанавливается как `"usdt"` при создании и обновлении методов
- Удален параметр `currency` из схемы валидации

### 2. Система аутентификации мерчантов

#### Новые файлы:

##### `/src/routes/merchant/auth.ts`
Маршруты для аутентификации мерчантов:
- `POST /merchant/auth/login` - вход с использованием API токена
- `POST /merchant/auth/logout` - выход из системы
- `GET /merchant/auth/me` - получение текущего мерчанта

##### `/src/middleware/merchantSessionGuard.ts`
Middleware для защиты маршрутов с использованием сессий (Bearer токен)

### 3. Панель управления мерчанта

##### `/src/routes/merchant/dashboard.ts`
API эндпоинты для дашборда:
- `GET /merchant/dashboard/statistics` - статистика транзакций
- `GET /merchant/dashboard/transactions` - список транзакций с фильтрами
- `POST /merchant/dashboard/transactions/:id/dispute` - создание спора с загрузкой файлов
- `GET /merchant/dashboard/chart-data` - данные для графиков

### 4. Интерактивная документация API

##### `/src/routes/merchant/api-docs.ts`
- `GET /merchant/api-docs/endpoints` - полная документация всех API эндпоинтов
- `POST /merchant/api-docs/test` - тестирование API запросов

### 5. Примеры HTML страниц

##### `/docs/merchant-login-example.html`
Страница входа для мерчантов с:
- Формой ввода API токена
- Сохранением сессии в localStorage
- Автоматической проверкой валидности сессии

##### `/docs/merchant-dashboard-example.html`
Полнофункциональная панель управления с:
- Боковым меню навигации
- Статистикой транзакций
- Таблицей транзакций с фильтрами
- Созданием споров с загрузкой файлов
- Интерактивной документацией API
- Страницей настроек

## API эндпоинты

### Аутентификация

#### Вход в систему
```http
POST /merchant/auth/login
Content-Type: application/json

{
  "token": "merchant_api_token"
}
```

Ответ:
```json
{
  "success": true,
  "sessionToken": "session_token",
  "expiresAt": "2024-01-02T10:00:00.000Z",
  "merchant": {
    "id": "merchant_id",
    "name": "Merchant Name",
    "balanceUsdt": 1000.50,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "statistics": {
      "totalTransactions": 100,
      "successfulTransactions": 80,
      "successRate": 80,
      "totalVolume": 500000
    }
  }
}
```

### Дашборд

#### Получение статистики
```http
GET /merchant/dashboard/statistics?period=today
Authorization: Bearer session_token
```

Параметры:
- `period` - период статистики: `today`, `week`, `month`, `all`

#### Список транзакций
```http
GET /merchant/dashboard/transactions?page=1&limit=20&status=READY
Authorization: Bearer session_token
```

Параметры фильтрации:
- `page` - номер страницы
- `limit` - количество записей
- `status` - статус транзакции
- `type` - тип (IN/OUT)
- `methodId` - ID метода
- `orderId` - поиск по Order ID
- `dateFrom` - дата от
- `dateTo` - дата до
- `amountFrom` - сумма от
- `amountTo` - сумма до

#### Создание спора
```http
POST /merchant/dashboard/transactions/:id/dispute
Authorization: Bearer session_token
Content-Type: application/json

{
  "reason": "Описание причины спора",
  "files": [
    {
      "name": "receipt.png",
      "data": "data:image/png;base64,..."
    }
  ]
}
```

## Использование HTML страниц

1. Разместите HTML файлы на веб-сервере
2. Настройте `API_BASE_URL` в JavaScript коде
3. Мерчанты могут войти используя свой API токен
4. После входа создается сессия на 24 часа
5. Все API запросы автоматически используют сессионный токен

## Безопасность

- API токены мерчантов должны храниться в безопасности
- Сессионные токены истекают через 24 часа
- Все запросы к дашборду требуют валидной сессии
- API запросы используют оригинальный API ключ мерчанта

## Примечания

- Интерфейс полностью на русском языке
- Поддерживается загрузка файлов при создании споров
- Статистика обновляется в реальном времени
- API документация включает примеры запросов и ответов