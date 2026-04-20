#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  local code=$?
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  exit "$code"
}
trap cleanup INT TERM EXIT

echo "Starting backend (port ${PORT:-5003})..."
"$ROOT_DIR/run_backend.sh" &
BACKEND_PID=$!

echo "Starting frontend (port ${FRONTEND_PORT:-3000})..."
"$ROOT_DIR/run_frontend.sh"
