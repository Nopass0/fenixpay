#!/bin/bash

set -e

echo "=== Docker Safe Migration Script ==="

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Проверка переменных окружения
check_env() {
    if [ -z "$DATABASE_URL" ]; then
        log "❌ ERROR: DATABASE_URL не установлен"
        exit 1
    fi
    log "✅ DATABASE_URL установлен"
}

# Проверка подключения к базе данных
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

# Генерация Prisma клиента
generate_client() {
    log "Генерация Prisma клиента..."
    if bunx prisma generate; then
        log "✅ Prisma клиент сгенерирован"
        return 0
    else
        log "❌ Ошибка генерации Prisma клиента"
        return 1
    fi
}

# Безопасное применение миграций
safe_migrate() {
    log "Проверка статуса миграций..."
    
    # Проверяем текущий статус
    local status_output
    if ! status_output=$(bunx prisma migrate status 2>&1); then
        log "Ошибка при проверке статуса миграций:"
        echo "$status_output"
        
        # Пытаемся найти застрявшую миграцию
        local failed_migration
        failed_migration=$(echo "$status_output" | grep -oE '[0-9]{8}_[a-zA-Z0-9_]+' | head -1)
        
        if [ -n "$failed_migration" ]; then
            log "Найдена проблемная миграция: $failed_migration"
            log "Попытка восстановления..."
            
            if bunx prisma migrate resolve --applied "$failed_migration"; then
                log "✅ Миграция $failed_migration отмечена как применённая"
            else
                log "❌ Не удалось отметить миграцию как применённую"
                return 1
            fi
        fi
    fi
    
    # Применяем миграции
    log "Применение миграций..."
    if bunx prisma migrate deploy; then
        log "✅ Миграции успешно применены"
        return 0
    else
        log "❌ Ошибка при применении миграций"
        return 1
    fi
}

# Основная функция
main() {
    log "Начало процесса миграции в Docker контейнере"
    
    # Проверяем переменные окружения
    check_env
    
    # Проверяем подключение к БД
    if ! check_db_connection; then
        exit 1
    fi
    
    # Генерируем клиент
    if ! generate_client; then
        exit 1
    fi
    
    # Применяем миграции
    if ! safe_migrate; then
        log "❌ Миграции не удалось применить"
        exit 1
    fi
    
    # Финальная проверка
    log "Финальная проверка статуса миграций:"
    bunx prisma migrate status || true
    
    log "🎉 Миграции успешно завершены!"
}

# Запуск
main "$@"
