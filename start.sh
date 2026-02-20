#!/bin/bash

# Простой скрипт для запуска локального сервера

PORT=8000

echo "🚀 Запуск SPHINX GTD на http://localhost:$PORT"
echo ""
echo "Откройте в браузере: http://localhost:$PORT"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""

# Проверяем наличие Python
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
# Проверяем наличие Node.js и npx
elif command -v npx &> /dev/null; then
    npx http-server -p $PORT -c-1
# Проверяем наличие PHP
elif command -v php &> /dev/null; then
    php -S localhost:$PORT
else
    echo "❌ Не найдено подходящего инструмента для запуска сервера."
    echo ""
    echo "Установите один из вариантов:"
    echo "  - Python 3: brew install python3"
    echo "  - Node.js: brew install node"
    echo "  - PHP: brew install php"
    echo ""
    echo "Или просто откройте index.html в браузере."
    exit 1
fi
