#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
PORT="${FRONTEND_PORT:-3000}"

cd "$FRONTEND_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed. Install Node.js first."
  exit 127
fi

if [[ ! -d "node_modules" || ! -x "node_modules/.bin/react-scripts" ]]; then
  npm install
fi

if lsof -ti:"$PORT" >/dev/null 2>&1; then
  echo "Port $PORT is in use. Stopping existing process..."
  lsof -ti:"$PORT" | xargs kill -9 2>/dev/null || true
fi

echo "Starting frontend on http://localhost:$PORT"
PORT="$PORT" BROWSER=none npm start
