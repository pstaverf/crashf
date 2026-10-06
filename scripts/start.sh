#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-8787}"
HOST="${HOST:-127.0.0.1}"
export PORT HOST

node_major=$(node -p "process.versions.node.split('.').map(Number)[0]" 2>/dev/null || echo 0)
node_minor=$(node -p "process.versions.node.split('.').map(Number)[1]" 2>/dev/null || echo 0)

if [ "$node_major" -lt 22 ] || { [ "$node_major" -eq 22 ] && [ "$node_minor" -lt 18 ]; }; then
  echo "Нужен Node 22.18 или новее, сейчас $(node -v 2>/dev/null || echo 'не установлен')."
  echo "В Termux: pkg install nodejs"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Ставлю зависимости…"
  npm install --no-audit --no-fund
fi

if [ ! -f dist/index.html ] || [ -n "$(find src shared index.html -newer dist/index.html 2>/dev/null | head -1)" ]; then
  echo "Собираю фронтенд…"
  npm run build
fi

if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
  echo "Wake-lock взят — Android не усыпит процесс."
  trap 'termux-wake-unlock >/dev/null 2>&1 || true' EXIT
fi

echo "Сервер на http://$HOST:$PORT"
exec node server/index.ts
