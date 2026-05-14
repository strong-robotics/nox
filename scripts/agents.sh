#!/usr/bin/env bash
# Show current agent pipeline and process state. Read-only, no kill.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUNTIME_DIR="multi-agent/.runtime"
STATUS_FILE="multi-agent/status.json"

declare -a LABELS PIDS

add_agent() {
  local label="$1" pid="$2"
  [[ -z "$pid" || "$pid" == "-" ]] && return
  kill -0 "$pid" 2>/dev/null || return
  LABELS+=("$label")
  PIDS+=("$pid")
}

is_known_pid() {
  local p
  for p in "${PIDS[@]+"${PIDS[@]}"}"; do [[ "$p" == "$1" ]] && return 0; done
  return 1
}

# VSCode
while IFS= read -r line; do
  script_pid=$(echo "$line" | awk '{print $2}')
  cmd=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf $i" "; print ""}')
  role=$(echo "$cmd" | grep -o 'vscode_wait_for_status\.py [A-Za-z]*' | awk '{print $2}')
  [[ -z "$role" ]] && role=$(echo "$cmd" | grep -o 'vscode_wait_for_task\.py' | sed 's/vscode_wait_for_task\.py/Architect/')
  [[ -z "$role" ]] && role="unknown"
  is_known_pid "$script_pid" && continue
  add_agent "vscode $role" "$script_pid"
done < <(ps aux | grep "vscode_wait_for_" | grep -v grep || true)

# Antigravity
while IFS= read -r line; do
  script_pid=$(echo "$line" | awk '{print $2}')
  cmd=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf $i" "; print ""}')
  role=$(echo "$cmd" | grep -o 'wait_for_status\.py [A-Za-z]*' | awk '{print $2}')
  [[ -z "$role" ]] && role=$(echo "$cmd" | grep -o 'wait_for_task\.py' | sed 's/wait_for_task\.py/Architect/')
  [[ -z "$role" ]] && role="unknown"
  is_known_pid "$script_pid" && continue
  add_agent "antigravity $role" "$script_pid"
done < <(ps aux | grep "antigravity_wait_for_" | grep -v grep || true)

# Cursor
for pidfile in "$RUNTIME_DIR"/cursor_*.pid; do
  [[ -f "$pidfile" ]] || continue
  pid=$(cat "$pidfile" 2>/dev/null | tr -d '[:space:]')
  name=$(basename "$pidfile" .pid | sed 's/cursor_/cursor /')
  add_agent "$name" "$pid"
done

# Codex
for pidfile in "$RUNTIME_DIR"/codex_*_supervisor.pid; do
  [[ -f "$pidfile" ]] || continue
  pid=$(cat "$pidfile" 2>/dev/null | tr -d '[:space:]')
  name=$(basename "$pidfile" .pid | sed 's/codex_/codex /' | sed 's/_supervisor//')
  add_agent "$name" "$pid"
done
while IFS= read -r line; do
  pid=$(echo "$line" | awk '{print $2}')
  is_known_pid "$pid" && continue
  role=$(echo "$line" | grep -o "codex_supervisor\.sh [a-z]*" | awk '{print $2}')
  add_agent "codex ${role:-supervisor}" "$pid"
done < <(ps aux | grep "codex_supervisor" | grep -v grep || true)

# Codex.app chat waiters
for pidfile in "$RUNTIME_DIR"/codex_app_*.pid; do
  [[ -f "$pidfile" ]] || continue
  pid=$(cat "$pidfile" 2>/dev/null | tr -d '[:space:]')
  name=$(basename "$pidfile" .pid | sed 's/codex_app_/codex_app /')
  add_agent "$name" "$pid"
done
while IFS= read -r line; do
  pid=$(echo "$line" | awk '{print $2}')
  is_known_pid "$pid" && continue
  role=$(echo "$line" | grep -o "codex_app_wait_for_status\.py [A-Za-z]*" | awk '{print $2}')
  add_agent "codex_app ${role:-waiter}" "$pid"
done < <(ps aux | grep "codex_app_wait_for_status.py" | grep -v grep || true)

# Pipeline status
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  PIPELINE STATUS"
echo "═══════════════════════════════════════════════════════"
if command -v python3 &>/dev/null && [[ -f "$STATUS_FILE" ]]; then
  python3 - "$STATUS_FILE" <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
print(f"  Run ID  : {data.get('run_id', '-')}")
print(f"  Task    : {data.get('current_task', '-')}")
print()
for r in data.get('pipeline', []):
    icon = {'waiting': '..', 'ready': '>>', 'in_progress': '##', 'completed': 'OK'}.get(r['status'], '??')
    print(f"  {icon}  {r['role']:<12} {r['status']}")
PYEOF
fi

if command -v python3 &>/dev/null; then
  python3 - "$RUNTIME_DIR" <<'PYEOF'
import json, os, signal, sys
from pathlib import Path

runtime = Path(sys.argv[1])
selected = ""
config_path = runtime / "codex_app_current_role.json"
if config_path.exists():
    try:
        config = json.loads(config_path.read_text())
        selected = str(config.get("role_lower") or config.get("role") or "").lower()
    except Exception:
        selected = ""
states = []
for role in ("architect", "designer", "developer", "tester"):
    path = runtime / f"codex_app_{role}.state.json"
    if not path.exists():
        continue
    try:
        data = json.loads(path.read_text())
    except Exception:
        continue
    pid = data.get("wait_pid")
    alive = False
    if isinstance(pid, int):
        try:
            os.kill(pid, 0)
            alive = True
        except OSError:
            alive = False
    states.append((role, data, pid, alive))

if states:
    print()
    print("═══════════════════════════════════════════════════════")
    print("  CODEX.APP CHAT STATES")
    print("═══════════════════════════════════════════════════════")
    for role, data, pid, alive in states:
        state = data.get("state", "unknown")
        signal_received = data.get("signal_received", False)
        updated = data.get("last_updated", "-")
        marker = ">>" if signal_received else (".." if state == "polling" else "!!")
        selected_mark = "*" if role == selected else " "
        strategy = data.get("strategy", "")
        heartbeat = data.get("last_heartbeat_at")
        mode = "heartbeat" if strategy == "heartbeat_direct_status_check" else "waiter"
        live = "live" if alive else ("virtual" if mode == "heartbeat" else "no-pid")
        print(f"  {marker}{selected_mark} {role.title():<12} {state:<16} signal={str(signal_received):<5} mode={mode:<9} {live:<7} pid={pid or '-'} updated={updated}")
PYEOF
fi

# Agent list
if [[ ${#PIDS[@]} -eq 0 ]]; then
  echo ""
  echo "  No active agent processes found."
  echo ""
  exit 0
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  ACTIVE OS AGENT PROCESSES"
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  Note: Codex.app heartbeat agents are virtual and are shown in CODEX.APP CHAT STATES above."
printf "  %-4s  %-7s  %-28s  %-8s  %-30s  %s\n" "#" "PID" "ROLE" "ELAPSED" "WORKSPACE" "STARTED"
echo "  ─────────────────────────────────────────────────────────────────────────"
for i in "${!PIDS[@]}"; do
  pid="${PIDS[$i]}"
  label="${LABELS[$i]}"
  cwd=$(lsof -p "$pid" 2>/dev/null | awk '/cwd/{print $NF}' | head -1)
  workspace=$(echo "$cwd" | awk -F'/' '{print $(NF-1)"/"$NF}')
  started=$(ps -p "$pid" -o lstart= 2>/dev/null | xargs)
  raw=$(ps -p "$pid" -o etime= 2>/dev/null | xargs)
  elapsed=$(echo "$raw" | awk -F'[-:]' '{
    n=NF; s=0
    if(n==4) s=$1*86400+$2*3600+$3*60+$4
    else if(n==3) s=$1*3600+$2*60+$3
    else if(n==2) s=$1*60+$2
    else s=$1
    m=int(s/60); h=int(m/60); m=m%60
    if(h>0) printf h"h "m"m\n"; else print m"m"
  }')
  printf "  [%d]   %-7s  %-28s  %-8s  %-30s  %s\n" \
    "$((i+1))" "$pid" "$label" "$elapsed" "$workspace" "$started"
done
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
