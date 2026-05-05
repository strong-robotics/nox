#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ROLE="${1:-architect}"
case "$ROLE" in
  architect|designer|developer|tester) ;;
  *)
    echo "Usage: bash stop_cursor.sh [architect|designer|developer|tester]"
    exit 1
    ;;
esac

PID_FILE="$ROOT_DIR/multi-agent/.runtime/cursor_${ROLE}.pid"

# Try PID file first
if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"

  if [[ -z "${PID:-}" ]]; then
    rm -f "$PID_FILE"
    echo "Empty PID file removed for Cursor $ROLE."
    exit 0
  elif ! kill -0 "$PID" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "Cursor $ROLE was not running (stale PID $PID). Removed."
    exit 0
  else
    echo "Stopping Cursor $ROLE: PID $PID"
    kill -TERM "$PID" 2>/dev/null || true

    for _ in 1 2 3 4 5; do
      if ! kill -0 "$PID" 2>/dev/null; then
        rm -f "$PID_FILE"
        echo "Stopped Cursor $ROLE."
        exit 0
      fi
      sleep 1
    done

    echo "Did not stop after TERM; sending KILL."
    kill -KILL "$PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "Stopped Cursor $ROLE."
    exit 0
  fi
fi

# No PID file — cannot safely identify which process is the Cursor agent
echo "No PID file at $PID_FILE"
echo "Cannot stop safely without it — boot the Cursor $ROLE agent first so it writes its PID."
exit 1
