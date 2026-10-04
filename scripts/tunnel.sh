#!/usr/bin/env bash
set -euo pipefail

TOKEN="${CF_TUNNEL_TOKEN:-}"

if [ -z "$TOKEN" ] && [ -f "$HOME/.cf-tunnel-token" ]; then
  TOKEN="$(cat "$HOME/.cf-tunnel-token")"
fi

if [ -z "$TOKEN" ]; then
  echo "Нет токена туннеля."
  echo "Положите его в ~/.cf-tunnel-token или задайте CF_TUNNEL_TOKEN."
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared не установлен. В Termux: pkg install tur-repo -y && pkg install cloudflared -y"
  exit 1
fi

exec cloudflared tunnel --no-autoupdate run --token "$TOKEN"
