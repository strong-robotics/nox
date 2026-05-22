#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ROLE="${1:-developer}"
case "$ROLE" in
  architect|designer|developer|tester) ;;
  *)
    echo "Usage: bash stop_codex.sh [architect|designer|developer|tester]"
    exit 1
    ;;
esac

PID_FILE="$ROOT_DIR/multi-agent/.runtime/codex_${ROLE}_supervisor.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No PID file for Codex $ROLE supervisor."
  exit 0
fi

PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -z "${PID:-}" ]]; then
  rm -f "$PID_FILE"
  echo "Empty PID file removed for Codex $ROLE supervisor."
  exit 0
fi

if ! kill -0 "$PID" 2>/dev/null; then
  rm -f "$PID_FILE"
  echo "Codex $ROLE supervisor was not running. Removed stale PID $PID."
  exit 0
fi

echo "Stopping Codex $ROLE supervisor: PID $PID"
kill -TERM "-$PID" 2>/dev/null || kill -TERM "$PID" 2>/dev/null || true

for _ in 1 2 3 4 5; do
  if ! kill -0 "$PID" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "Stopped Codex $ROLE supervisor."
    exit 0
  fi
  sleep 1
done

echo "Codex $ROLE supervisor did not stop after TERM; sending KILL."
kill -KILL "-$PID" 2>/dev/null || kill -KILL "$PID" 2>/dev/null || true
rm -f "$PID_FILE"
echo "Stopped Codex $ROLE supervisor."
