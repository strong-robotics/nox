#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ROLE="${1:-developer}"
case "$ROLE" in
  architect|designer|developer|tester) ;;
  *)
    echo "Usage: bash start_codex.sh [architect|designer|developer|tester]"
    exit 1
    ;;
esac

RUNTIME_DIR="$ROOT_DIR/multi-agent/.runtime"
PID_FILE="$RUNTIME_DIR/codex_${ROLE}_supervisor.pid"
LOG_FILE="$RUNTIME_DIR/codex_${ROLE}_supervisor.log"
mkdir -p "$RUNTIME_DIR"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "Codex $ROLE supervisor is already running: PID $PID"
    echo "Status: bash status_codex.sh $ROLE"
    echo "Stop  : bash stop_codex.sh $ROLE"
    exit 0
  fi
fi

python3 - "$ROOT_DIR" "$ROLE" "$LOG_FILE" "$PID_FILE" <<'PY'
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(sys.argv[1])
role = sys.argv[2]
log_path = Path(sys.argv[3])
pid_path = Path(sys.argv[4])

timestamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
with log_path.open("ab", buffering=0) as log:
    log.write(f"\n[START] {timestamp} starting Codex {role} supervisor\n".encode())
    proc = subprocess.Popen(
        ["bash", "multi-agent/core/codex_supervisor.sh", role],
        cwd=str(root),
        stdin=subprocess.DEVNULL,
        stdout=log,
        stderr=subprocess.STDOUT,
        start_new_session=True,
        close_fds=True,
    )

pid_path.write_text(str(proc.pid) + "\n", encoding="utf-8")
print(proc.pid)
PY

PID="$(cat "$PID_FILE")"
sleep 1

if kill -0 "$PID" 2>/dev/null; then
  echo "Started Codex $ROLE supervisor: PID $PID"
  echo "Log   : tail -f multi-agent/.runtime/codex_${ROLE}_supervisor.log"
  echo "Status: bash status_codex.sh $ROLE"
  echo "Stop  : bash stop_codex.sh $ROLE"
else
  echo "Codex $ROLE supervisor failed to stay running. Last log lines:"
  tail -n 40 "$LOG_FILE" 2>/dev/null || true
  exit 1
fi
