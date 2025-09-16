# Исправленная реализация аукционной системы

## 🎯 Правильная архитектура

**МЫ ПРИНИМАЕМ** трафик от мерчанта и **ПРЕДОСТАВЛЯЕМ API** для внешних аукционных систем.

### Поток данных:
1. **Внешние системы** → **НАМ**: Отправляют запросы на создание/управление заказами
2. **МЫ**: Обрабатываем заказы через обычный флоу (трейдеры, реквизиты, расчеты)
3. **МЫ** → **Внешние системы**: Отправляем callback'и об изменениях статусов

## ✅ Реализованные компоненты

### 1. API Endpoints для внешних систем ✅
**Файл**: `backend/src/routes/auction/external-api.ts`

#### Endpoints которые МЫ предоставляем:
- `POST /api/auction/external/CreateOrder` - создание заказа от внешней системы
- `POST /api/auction/external/CancelOrder` - отмена заказа
- `POST /api/auction/external/GetStatusOrder` - получение статуса заказа
- `POST /api/auction/external/CreateDispute` - создание спора

**Особенности**:
- Валидация RSA подписи всех входящих запросов
- Создание реквизитов из доступных трейдеров
- Создание транзакций в нашей системе
- Возврат payment_details (номера карт/телефонов)

### 2. Сервис отправки callback'ов ✅
**Файл**: `backend/src/services/auction-callback-sender.ts`

**Функции**:
- Отправка подписанных callback'ов внешним системам
- Уведомления об изменении статуса заказов
- Уведомления об изменении сумм
- Обработка ошибок и таймаутов

### 3. Интеграция с основным флоу ✅
**Обновлен**: `backend/src/routes/merchant/index.ts`

**Логика**:
- Аукционные мерчанты обрабатываются как обычные
- После создания транзакции отправляется уведомление внешней системе
- Все расчеты (комиссии, заморозка, прибыль) остаются идентичными

### 4. Админка ✅
**Файл**: `backend/src/routes/admin/auction.ts`

**Endpoints**:
- `POST /admin/auction/generate-keys/{merchantId}` - генерация RSA ключей
- `PUT /admin/auction/toggle/{merchantId}` - включение аукционной системы
- `GET /admin/auction/download-key/{merchantId}/{keyType}` - скачивание ключей
- `GET /admin/auction/status/{merchantId}` - статус конфигурации

## 🔧 Конфигурация мерчанта

### Поля в БД:
```sql
isAuctionEnabled     BOOLEAN  -- включена ли аукционная система
auctionBaseUrl       TEXT     -- URL для отправки callback'ов внешней системе
rsaPublicKeyPem      TEXT     -- публичный ключ для проверки подписей
rsaPrivateKeyPem     TEXT     -- приватный ключ для подписи callback'ов
externalSystemName   TEXT     -- имя внешней системы
keysGeneratedAt      TIMESTAMP -- дата генерации ключей
```

### Настройка:
1. Включить `isAuctionEnabled = true`
2. Указать `auctionBaseUrl` - куда отправлять callback'и
3. Указать `externalSystemName` - для подписи запросов
4. Сгенерировать RSA ключи
5. Передать публичный ключ внешней системе

## 📋 Примеры использования

### 1. Внешняя система создает заказ у нас:

```bash
curl -X POST "https://api.chasepay.pro/auction/external/CreateOrder" \
  -H "Content-Type: application/json" \
  -H "X-Timestamp: 1706534400" \
  -H "X-Signature: dGVzdF9zaWduYXR1cmU=" \
  -d '{
    "system_order_id": "ext-order-123",
    "currency": "RUB",
    "amount": 1000,
    "max_exchange_rate": 120,
    "max_commission": 5,
    "cancel_order_time_unix": 1706538000,
    "stop_auction_time_unix": 1706534430,
    "callback_url": "https://external-system.com/callback",
    "allowed_payment_method": "sbp"
  }'
```

**Ответ**:
```json
{
  "is_success": true,
  "external_order_id": "tx-456-789",
  "payment_details": {
    "type": "sbp",
    "phone_number": "+79001234567",
    "bank_name": "Сбербанк",
    "name": "ООО Компания"
  },
  "exchange_rate": 95.0,
  "commission": 3.0
}
```

### 2. Мы отправляем callback внешней системе:

```bash
# При изменении статуса заказа
curl -X POST "https://external-system.com/callback" \
  -H "Content-Type: application/json" \
  -H "X-Timestamp: 1706534500" \
  -H "X-Signature: callback_signature_here" \
  -d '{
    "order_id": "ext-order-123",
    "status_id": 6,
    "amount": 1000
  }'
```

## 🔄 Жизненный цикл заказа

1. **Внешняя система** отправляет `CreateOrder` → **НАМ**
2. **МЫ** создаем транзакцию, находим трейдера, возвращаем реквизиты
3. **МЫ** отправляем callback (status_id: 1 - создана) → **Внешней системе**
4. Трейдер обрабатывает заказ как обычно
5. **МЫ** отправляем callback (status_id: 6 - завершена) → **Внешней системе**

## 🛡️ Безопасность

### RSA подпись:
- Все входящие запросы проверяются на валидную подпись
- Все исходящие callback'и подписываются нашим приватным ключом
- Временное окно ±120 секунд для timestamp

### Валидация:
- Проверка существования мерчанта по external_system_name
- Проверка доступности трейдеров и реквизитов
- Проверка лимитов и методов платежа

## 📊 Мониторинг

### Логирование:
- Все входящие запросы от внешних систем
- Все исходящие callback'и
- Ошибки валидации подписей
- Время обработки запросов

### Метрики:
- Количество заказов от внешних систем
- Успешность доставки callback'ов
- Среднее время обработки

## 🚀 Готовые endpoints

### Для внешних систем:
- `POST /api/auction/external/CreateOrder`
- `POST /api/auction/external/CancelOrder`
- `POST /api/auction/external/GetStatusOrder`
- `POST /api/auction/external/CreateDispute`

### Для админки:
- `POST /api/admin/auction/generate-keys/{merchantId}`
- `PUT /api/admin/auction/toggle/{merchantId}`
- `GET /api/admin/auction/download-key/{merchantId}/{keyType}`
- `GET /api/admin/auction/status/{merchantId}`

## ✅ Результат

Система полностью готова для приема заказов от внешних аукционных систем с:
- ✅ Валидацией RSA подписей
- ✅ Созданием реквизитов из наших трейдеров
- ✅ Сохранением всех расчетов как в обычном флоу
- ✅ Отправкой callback'ов об изменениях статусов
- ✅ Полной интеграцией с существующей системой
