#!/usr/bin/env bash
# Stop the cheap Codex.app chat waiter for one role.

set -euo pipefail

ROLE_INPUT="${1:-developer}"
ROLE_INPUT_LC="$(printf '%s' "$ROLE_INPUT" | tr '[:upper:]' '[:lower:]')"
case "$ROLE_INPUT_LC" in
  architect|designer|developer|tester) ROLE_LOWER="$ROLE_INPUT_LC" ;;
  *)
    echo "Usage: bash stop_codex_app.sh [architect|designer|developer|tester]"
    exit 1
    ;;
esac

RUNTIME_DIR="multi-agent/.runtime"
PID_FILE="$RUNTIME_DIR/codex_app_${ROLE_LOWER}.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No Codex.app $ROLE_LOWER waiter pid file."
  exit 0
fi

PID="$(tr -d '[:space:]' < "$PID_FILE")"
if [[ -z "$PID" ]] || ! kill -0 "$PID" 2>/dev/null; then
  rm -f "$PID_FILE"
  echo "Codex.app $ROLE_LOWER waiter is not running. Removed stale pid file."
  exit 0
fi

kill "$PID"
sleep 0.5

if kill -0 "$PID" 2>/dev/null; then
  echo "Sent SIGTERM to Codex.app $ROLE_LOWER waiter PID $PID."
else
  rm -f "$PID_FILE"
  echo "Stopped Codex.app $ROLE_LOWER waiter PID $PID."
fi
