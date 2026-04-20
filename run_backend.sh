#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PORT="${PORT:-5003}"

ENV_FILE="$ROOT_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  # Export variables from .env for backend runtime (SMTP, PORT, etc.)
  set -a
  source "$ENV_FILE"
  set +a
fi

cd "$BACKEND_DIR"

if [[ ! -d "venv" ]]; then
  python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt >/dev/null

if lsof -ti:"$PORT" >/dev/null 2>&1; then
  lsof -ti:"$PORT" | xargs kill -9 2>/dev/null || true
fi

echo "Starting backend on port $PORT"
python app.py --port "$PORT"
