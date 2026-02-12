#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ARTIFACT_DIR="${ARTIFACT_DIR:-$ROOT_DIR/artifacts/backend-signoff}"
mkdir -p "$ARTIFACT_DIR"

log_step() {
  printf '\n[%s] %s\n' "$(date -u +%H:%M:%S)" "$1"
}

log_step "Lint backend surfaces"
./node_modules/.bin/eslint \
  server.js \
  src/config/session.js \
  src/middleware/auth.js \
  src/routes/auth.js \
  src/routes/interviews.js \
  src/services/feedback/index.js \
  src/services/feedback/providers/ruleBasedProvider.js \
  src/services/feedbackService.js \
  src/validators/api.js \
  test-integration.js \
  | tee "$ARTIFACT_DIR/lint.log"

log_step "Run backend API/service tests with coverage (CI profile)"
npm run test:backend:ci | tee "$ARTIFACT_DIR/backend-tests.log"

if [[ "${RUN_DB_CHECKS:-true}" == "true" ]]; then
  log_step "Verify database connectivity"
  npm run test:db | tee "$ARTIFACT_DIR/db-check.log"
fi

if [[ "${RUN_SEED:-true}" == "true" ]]; then
  log_step "Seed interview question data"
  npm run seed | tee "$ARTIFACT_DIR/seed.log"
fi

if [[ "${RUN_LIVE_FLOW:-true}" == "true" ]]; then
  PORT="${PORT:-3000}"
  SERVER_LOG="$ARTIFACT_DIR/server.log"
  HEALTH_LOG="$ARTIFACT_DIR/health.json"
  READY_LOG="$ARTIFACT_DIR/ready.json"
  INTEGRATION_LOG="$ARTIFACT_DIR/integration.log"

  log_step "Start backend server for health and integration checks"
  NODE_ENV="${NODE_ENV:-test}" PORT="$PORT" npm start >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!

  cleanup() {
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  }
  trap cleanup EXIT

  for _ in $(seq 1 180); do
    if curl -fsS "http://127.0.0.1:${PORT}/api/health" >"$HEALTH_LOG"; then
      break
    fi
    sleep 2
  done

  if ! curl -fsS "http://127.0.0.1:${PORT}/api/health" >"$HEALTH_LOG"; then
    echo "Backend health check never became ready. See $SERVER_LOG" >&2
    exit 1
  fi

  curl -fsS "http://127.0.0.1:${PORT}/api/ready" >"$READY_LOG"

  log_step "Run backend integration journey"
  NODE_ENV="${NODE_ENV:-test}" PORT="$PORT" node test-integration.js | tee "$INTEGRATION_LOG"
fi

log_step "Backend sign-off verification complete"
echo "Artifacts written to: $ARTIFACT_DIR"
