#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Docker Compose ---
echo "Ensuring docker-compose services are up..."
if docker compose ps --status running 2>/dev/null | grep -q postgres; then
  echo "  Services already running."
else
  docker compose up -d --wait
  echo "  Postgres, LiteLLM, and Langfuse started."
fi

# --- Cleanup on exit ---
cleanup() {
  echo ""
  echo "Shutting down..."
  kill 0 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

# --- Host app (Spring Boot) ---
echo "Starting host app..."
"$ROOT_DIR/mvnw" -q spring-boot:run &

# --- MCP app (Spring Boot) ---
echo "Starting MCP app..."
cd "$ROOT_DIR/mcp-server"
./mvnw -q spring-boot:run &
cd "$ROOT_DIR"

# --- Plugins ---
for dir in "$ROOT_DIR"/plugins/*/; do
  if [ -f "$dir/package.json" ]; then
    name=$(basename "$dir")
    echo "Starting plugin: $name"
    (cd "$dir" && npm run dev) &
  fi
done

echo ""
echo "All services starting. Press Ctrl+C to stop everything."
wait
