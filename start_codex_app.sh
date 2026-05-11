#!/usr/bin/env bash
# Start the cheap Codex.app chat waiter for one role. This does not start a model.

set -euo pipefail

ROLE_INPUT="${1:-developer}"
ROLE_INPUT_LC="$(printf '%s' "$ROLE_INPUT" | tr '[:upper:]' '[:lower:]')"
case "$ROLE_INPUT_LC" in
  architect) ROLE="Architect" ;;
  designer) ROLE="Designer" ;;
  developer) ROLE="Developer" ;;
  tester) ROLE="Tester" ;;
  *)
    echo "Usage: bash start_codex_app.sh [architect|designer|developer|tester]"
    exit 1
    ;;
esac

ROLE_LOWER="$(printf '%s' "$ROLE" | tr '[:upper:]' '[:lower:]')"
RUNTIME_DIR="multi-agent/.runtime"
PID_FILE="$RUNTIME_DIR/codex_app_${ROLE_LOWER}.pid"
LOG_FILE="$RUNTIME_DIR/codex_app_${ROLE_LOWER}.log"
STATE_FILE="$RUNTIME_DIR/codex_app_${ROLE_LOWER}.state.json"

mkdir -p "$RUNTIME_DIR"

if [[ -f "$PID_FILE" ]]; then
  PID="$(tr -d '[:space:]' < "$PID_FILE")"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "Codex.app $ROLE waiter already running: PID $PID"
    echo "State: $STATE_FILE"
    exit 0
  fi
fi

if [[ "$ROLE_LOWER" == "architect" ]]; then
  nohup python3 multi-agent/core/codex_app_wait_for_task.py >> "$LOG_FILE" 2>&1 &
else
  nohup python3 multi-agent/core/codex_app_wait_for_status.py "$ROLE" ready >> "$LOG_FILE" 2>&1 &
fi
PID="$!"
echo "$PID" > "$PID_FILE"

echo "Started Codex.app $ROLE waiter: PID $PID"
echo "State: $STATE_FILE"
echo "Log:   $LOG_FILE"
echo "Note: this only waits for the queue. Codex.app heartbeat must wake the chat thread."
