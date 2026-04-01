#!/bin/sh
# =================================================================
#  docker-entrypoint.sh — Price Display
#  Inyecta API_BASE_URL en config.json antes de arrancar nginx
# =================================================================
set -e

CONFIG="/usr/share/nginx/html/config.json"

if [ -n "$API_BASE_URL" ]; then
  echo "[entrypoint] Configurando API base_url → $API_BASE_URL"
  # Reemplaza el valor de "base_url" en config.json
  sed -i "s|\"base_url\": \"[^\"]*\"|\"base_url\": \"$API_BASE_URL\"|g" "$CONFIG"
else
  echo "[entrypoint] API_BASE_URL no definida, se usa el valor de config.json"
fi

exec "$@"
