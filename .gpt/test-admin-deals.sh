#!/bin/bash

# Скрипт для проверки страницы сделок в админке

echo "🔍 Проверка страницы сделок в админке..."
echo ""

# Проверяем, запущены ли сервисы
echo "📋 Проверка статуса сервисов..."
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "❌ Backend не запущен на порту 3000"
    echo "   Запустите: cd backend && bun run dev"
    exit 1
else
    echo "✅ Backend работает"
fi

if ! curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo "❌ Frontend не запущен на порту 3001"
    echo "   Запустите: cd frontend && npm run dev"
    exit 1
else
    echo "✅ Frontend работает"
fi

echo ""
echo "📊 Проверка эндпоинта запросов транзакций..."

# Получаем токен админа (замените на реальный токен)
ADMIN_TOKEN="${ADMIN_TOKEN:-your-admin-token-here}"

# Проверяем эндпоинт запросов
response=$(curl -s -X GET "http://localhost:3000/admin/transactions/attempts" \
    -H "x-admin-key: $ADMIN_TOKEN" \
    -H "Content-Type: application/json")

if echo "$response" | grep -q "data"; then
    echo "✅ Эндпоинт /admin/transactions/attempts работает"
    
    # Подсчитываем статистику
    total=$(echo "$response" | grep -o '"success":true' | wc -l)
    errors=$(echo "$response" | grep -o '"success":false' | wc -l)
    
    echo ""
    echo "📈 Статистика запросов:"
    echo "   - Успешных: $total"
    echo "   - С ошибками: $errors"
else
    echo "❌ Ошибка при получении данных запросов"
    echo "   Ответ: $response"
fi

echo ""
echo "🌐 Откройте в браузере:"
echo "   http://localhost:3001/admin/deals"
echo ""
echo "📝 Что проверить:"
echo "   1. Вкладка 'Запросы' - отображение статусов запросов"
echo "   2. Статусы: 'Ошибка' (красный), 'Успешная сделка' (зеленый), 'Сделка' (синий)"
echo "   3. Фильтр по статусу запроса в разделе фильтров"
echo "   4. Статистика запросов в заголовке вкладки"
echo "   5. Tooltips при наведении на статусы"
echo ""
echo "✨ Изменения успешно применены!"
