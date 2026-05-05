#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ROLE="${1:-developer}"
case "$ROLE" in
  architect|designer|developer|tester) ;;
  *)
    echo "Usage: bash status_codex.sh [architect|designer|developer|tester]"
    exit 1
    ;;
esac

PID_FILE="$ROOT_DIR/multi-agent/.runtime/codex_${ROLE}_supervisor.pid"
LOG_FILE="$ROOT_DIR/multi-agent/.runtime/codex_${ROLE}_supervisor.log"

echo "Codex $ROLE supervisor"
echo "======================="

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
else
  PID=""
fi

if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
  echo "State : RUNNING"
  echo "PID   : $PID"
  ps -p "$PID" -o pid,ppid,stat,command || true
else
  echo "State : STOPPED"
  [[ -n "${PID:-}" ]] && echo "PID   : $PID (stale)"
fi

echo
echo "Matching Codex processes:"
ps -ef | rg 'codex_supervisor|codex_wait_for_status|codex exec' || true

echo
echo "Pipeline:"
python3 - <<'PY'
import json
from pathlib import Path

path = Path("multi-agent/status.json")
if not path.exists():
    print("status.json not found")
    raise SystemExit

data = json.loads(path.read_text(encoding="utf-8"))
print(f"run_id       : {data.get('run_id')}")
print(f"current_task : {data.get('current_task')}")
for item in data.get("pipeline", []):
    print(f"{item.get('role', '?'):10} : {item.get('status', '?'):12} {item.get('description', '')}")
PY

echo
echo "Recent log:"
tail -n 30 "$LOG_FILE" 2>/dev/null || echo "No log file yet."
