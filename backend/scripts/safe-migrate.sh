#!/bin/bash

set -e

echo "=== Безопасное применение миграций ==="

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Функция для проверки подключения к БД с повторными попытками
check_db_connection() {
    log "Проверка подключения к базе данных..."
    local retries=30
    local count=0
    
    while [ $count -lt $retries ]; do
        if bunx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
            log "✅ Подключение к базе данных установлено"
            return 0
        fi
        
        count=$((count + 1))
        log "Попытка подключения $count/$retries..."
        sleep 2
    done
    
    log "❌ Не удалось подключиться к базе данных после $retries попыток"
    return 1
}

# Функция для проверки статуса миграций
check_migration_status() {
    log "Проверка статуса миграций..."
    
    # Получаем статус миграций
    local status_output
    if ! status_output=$(bunx prisma migrate status 2>&1); then
        log "Ошибка при проверке статуса миграций:"
        echo "$status_output"
        return 1
    fi
    
    echo "$status_output"
    return 0
}

# Функция для безопасного применения миграций
safe_migrate_deploy() {
    log "Попытка применения миграций..."
    
    if bunx prisma migrate deploy; then
        log "✅ Миграции успешно применены"
        return 0
    else
        log "❌ Ошибка при применении миграций"
        return 1
    fi
}

# Функция для восстановления после неудачной миграции
recover_failed_migration() {
    log "Попытка восстановления после неудачной миграции..."
    
    # Получаем список неприменённых миграций
    local failed_migrations
    failed_migrations=$(bunx prisma migrate status 2>&1 | grep -A 100 "Following migration" | grep -E "^\s*[0-9]" | head -1 | xargs)
    
    if [ -n "$failed_migrations" ]; then
        log "Найдена неудачная миграция: $failed_migrations"
        
        # Пытаемся отметить её как применённую
        if bunx prisma migrate resolve --applied "$failed_migrations"; then
            log "✅ Миграция $failed_migrations отмечена как применённая"
            
            # Пытаемся применить оставшиеся миграции
            if bunx prisma migrate deploy; then
                log "✅ Оставшиеся миграции успешно применены"
                return 0
            else
                log "❌ Ошибка при применении оставшихся миграций"
                return 1
            fi
        else
            log "❌ Не удалось отметить миграцию как применённую"
            return 1
        fi
    else
        log "Неудачные миграции не найдены"
        return 1
    fi
}

# Функция для генерации Prisma клиента
generate_prisma_client() {
    log "Генерация Prisma клиента..."
    if bunx prisma generate; then
        log "✅ Prisma клиент успешно сгенерирован"
        return 0
    else
        log "❌ Ошибка при генерации Prisma клиента"
        return 1
    fi
}

# Основная логика
main() {
    log "Начало процесса миграции"
    
    # Показываем информацию о среде
    local masked_url=$(echo "${DATABASE_URL:-не установлен}" | sed 's/\/\/[^@]*@/\/\/***@/')
    log "DATABASE_URL: $masked_url"
    log "NODE_ENV: ${NODE_ENV:-не установлен}"
    
    # Проверяем, что используется правильная база для тестов
    if [[ "$DATABASE_URL" == *"localhost:5432"* ]]; then
        log "✅ Используется локальная тестовая база данных"
    elif [[ "$DATABASE_URL" == *"neon.tech"* ]] || [[ "$DATABASE_URL" == *"amazonaws.com"* ]]; then
        log "⚠️ Используется внешняя база данных"
    fi
    
    # Проверяем подключение к БД
    if ! check_db_connection; then
        log "Дополнительная диагностика:"
        log "Проверка доступности PostgreSQL сервиса..."
        
        # Проверяем, запущен ли PostgreSQL
        if command -v pg_isready >/dev/null 2>&1; then
            log "Проверка готовности PostgreSQL:"
            pg_isready -h localhost -p 5432 -U postgres || log "PostgreSQL не готов"
        fi
        
        log "Попытка подключения через psql..."
        if command -v psql >/dev/null 2>&1; then
            # Извлекаем основную часть URL без параметров для psql
            local db_url_clean=$(echo "$DATABASE_URL" | sed 's/?.*$//')
            log "Очищенный URL для psql: $db_url_clean"
            psql "$db_url_clean" -c "SELECT 1;" 2>&1 || log "psql подключение также неудачно"
        else
            log "psql не установлен"
        fi
        
        log "Проверка переменных окружения:"
        log "PGHOST: ${PGHOST:-не установлен}"
        log "PGPORT: ${PGPORT:-не установлен}"
        log "PGUSER: ${PGUSER:-не установлен}"
        log "PGDATABASE: ${PGDATABASE:-не установлен}"
        
        exit 1
    fi
    
    # Генерируем Prisma клиент
    if ! generate_prisma_client; then
        exit 1
    fi
    
    # Проверяем статус миграций
    log "Текущий статус миграций:"
    check_migration_status
    
    # Пытаемся применить миграции
    if safe_migrate_deploy; then
        log "🎉 Все миграции успешно применены!"
    else
        log "⚠️ Ошибка при применении миграций, пытаемся восстановить..."
        
        if recover_failed_migration; then
            log "🎉 Миграции успешно восстановлены и применены!"
        else
            log "❌ Не удалось восстановить миграции"
            log "Для ручного исправления выполните:"
            log "1. bunx prisma migrate status"
            log "2. bunx prisma migrate resolve --applied <migration_name>"
            log "3. bunx prisma migrate deploy"
            exit 1
        fi
    fi
    
    # Финальная проверка
    log "Финальная проверка статуса миграций:"
    check_migration_status
    
    log "✅ Процесс миграции завершён успешно"
}

# Запускаем основную функцию
main "$@"
