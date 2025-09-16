# Руководство по деплою миграций

## 🚀 Быстрый старт

### Для разработки
```bash
# Проверить статус
npm run db:status

# Синхронизировать миграции
npm run db:sync

# Применить миграции
npm run db:deploy
```

### Для продакшена
```bash
# Деплой в продакшен
npm run db:deploy:prod
```

## 📋 Полный пайплайн миграций

### 1. Структура файлов

```
backend/
├── prisma/
│   ├── migrations/                    # Файлы миграций Prisma
│   └── schema.prisma                  # Схема базы данных
├── scripts/
│   ├── migration-pipeline.ts          # Основной скрипт синхронизации
│   ├── deploy-migrations.sh           # Bash скрипт деплоя
│   ├── fix-migrations.ts              # Скрипт исправления миграций
│   └── cleanup-migration-files.ts     # Очистка временных файлов
├── Dockerfile.migrations              # Docker образ для миграций
├── docker-compose.migrations.yml      # Docker Compose конфигурация
├── MIGRATION_PIPELINE.md              # Документация пайплайна
├── CHASE_MIGRATIONS.md                # Документация Chase миграций
└── DEPLOYMENT_GUIDE.md                # Это руководство
```

### 2. Команды NPM

| Команда | Описание |
|---------|----------|
| `npm run db:status` | Проверить статус миграций |
| `npm run db:sync` | Синхронизировать миграции |
| `npm run db:deploy` | Деплой в dev окружение |
| `npm run db:deploy:prod` | Деплой в продакшен |
| `npm run db:migrate` | Создать новую миграцию |
| `npm run db:migrate:deploy` | Применить миграции |
| `npm run db:migrate:status` | Статус миграций Prisma |

### 3. Docker команды

```bash
# Запустить миграции в контейнере
docker-compose -f docker-compose.migrations.yml up migrations

# Только проверить статус
docker-compose -f docker-compose.migrations.yml run migrations ./scripts/deploy-migrations.sh production status

# Собрать образ миграций
docker build -f Dockerfile.migrations -t chase-migrations .
```

## 🔧 Настройка окружения

### Переменные окружения

Создайте файл `.env` в директории `backend/`:

```env
# База данных
DATABASE_URL="postgresql://user:password@localhost:5432/voicedb"

# Окружение
NODE_ENV="development"

# PostgreSQL (для Docker)
POSTGRES_DB="voicedb"
POSTGRES_USER="user"
POSTGRES_PASSWORD="password"
```

### Настройка CI/CD

1. Добавьте секреты в GitHub:
   - `DEV_DATABASE_URL` - URL для dev окружения
   - `PROD_DATABASE_URL` - URL для продакшена

2. Workflow автоматически запустится при:
   - Push в `main` или `dev` ветки
   - Изменениях в `backend/prisma/` или `backend/scripts/`

## 🛠️ Устранение проблем

### Проблема: Миграции не синхронизированы

**Симптомы:**
```
Your local migration history and the migrations table from your database are different
```

**Решение:**
```bash
npm run db:sync
```

### Проблема: Неудачная миграция

**Симптомы:**
```
Following migration have failed: migration_name
```

**Решение:**
```bash
# Если миграция уже применена вручную
npx prisma migrate resolve --applied "migration_name"

# Если нужно откатить
npx prisma migrate resolve --rolled-back "migration_name"
```

### Проблема: Схема не соответствует

**Симптомы:**
```
The database schema is not in sync with the Prisma schema
```

**Решение:**
```bash
# Синхронизировать схему
npx prisma db pull
npx prisma generate
```

### Проблема: Ошибки подключения к БД

**Симптомы:**
```
Error: P1001: Can't reach database server
```

**Решение:**
1. Проверьте `DATABASE_URL` в `.env`
2. Убедитесь, что PostgreSQL запущен
3. Проверьте сетевые настройки

## 📊 Мониторинг

### Проверка статуса

```bash
# Общий статус
npm run db:status

# Детальный статус Prisma
npx prisma migrate status

# История миграций
npx prisma migrate status --verbose
```

### Логи

Все операции логируются с временными метками:
- ✅ Успешные операции
- ⚠️ Предупреждения  
- ❌ Ошибки

### Проверка схемы

```bash
# Проверить соответствие схемы
npx prisma db pull --print

# Сгенерировать клиент
npx prisma generate
```

## 🔒 Безопасность

### Автоматические проверки

1. **Подключение к БД** - проверяется перед началом
2. **Статус миграций** - проверяется соответствие
3. **Схема БД** - проверяется корректность
4. **Бэкапы** - создаются для продакшена

### Рекомендации

1. **Никогда не деплойте миграции напрямую в продакшен**
2. **Всегда тестируйте на dev окружении**
3. **Создавайте бэкапы перед деплоем**
4. **Используйте CI/CD пайплайн**

## 🚀 Процесс деплоя

### 1. Разработка

```bash
# Создать миграцию
npm run db:migrate

# Проверить локально
npm run db:status
npm run db:sync
```

### 2. Тестирование

```bash
# Применить в dev
npm run db:deploy

# Проверить приложение
npm run dev
```

### 3. Продакшен

```bash
# Деплой через CI/CD или вручную
npm run db:deploy:prod
```

## 📚 Дополнительные ресурсы

- [Документация Prisma](https://www.prisma.io/docs/)
- [PostgreSQL документация](https://www.postgresql.org/docs/)
- [Docker документация](https://docs.docker.com/)

## 🆘 Поддержка

При возникновении проблем:

1. Проверьте логи: `npm run db:status`
2. Синхронизируйте миграции: `npm run db:sync`
3. Проверьте подключение к БД
4. Обратитесь к документации Prisma
5. Создайте issue в репозитории

---

**Важно:** Этот пайплайн обеспечивает надежное и безопасное управление миграциями. Следуйте инструкциям и используйте автоматизированные инструменты для минимизации рисков.

