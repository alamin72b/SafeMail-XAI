#!/usr/bin/env bash
# Runs the explainer service, backend, and frontend together in one terminal.
# Ctrl+C stops all three.
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_UVICORN="$ROOT_DIR/backend/explainer-service/.venv/bin/uvicorn"

if [ ! -x "$VENV_UVICORN" ]; then
  echo "Explainer service venv not found. Set it up first:"
  echo "  cd backend/explainer-service && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

trap 'kill 0' EXIT INT TERM

(cd "$ROOT_DIR/backend/explainer-service" && "$VENV_UVICORN" app:app --host 0.0.0.0 --port 8000) &
(cd "$ROOT_DIR/backend" && npm run start:dev) &
(cd "$ROOT_DIR/frontend" && npm run dev) &

wait
