#!/usr/bin/env bash
# Kill a multi-agent pipeline agent by interactive selection.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUNTIME_DIR="multi-agent/.runtime"
STATUS_FILE="multi-agent/status.json"

# ── collect agents ──────────────────────────────────────────────────────────
declare -a LABELS PIDS

add_agent() {
  local label="$1" pid="$2"
  [[ -z "$pid" || "$pid" == "-" ]] && return
  # verify process actually exists
  kill -0 "$pid" 2>/dev/null || return
  LABELS+=("$label")
  PIDS+=("$pid")
}

is_known_pid() {
  local p
  for p in "${PIDS[@]+"${PIDS[@]}"}"; do [[ "$p" == "$1" ]] && return 0; done
  return 1
}

# ── Antigravity: detect by running wait_for_status/task script (not pid file) ──
# Real indicator = antigravity_wait_for_*.py is running for that role
while IFS= read -r line; do
  script_pid=$(echo "$line" | awk '{print $2}')
  cmd=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf $i" "; print ""}')
  # extract role from args e.g. "antigravity_wait_for_status.py Developer ready"
  role=$(echo "$cmd" | grep -o 'wait_for_status\.py [A-Za-z]*' | awk '{print $2}')
  [[ -z "$role" ]] && role=$(echo "$cmd" | grep -o 'wait_for_task\.py' | sed 's/wait_for_task\.py/Architect/')
  [[ -z "$role" ]] && role="unknown"
  # kill the script itself — language_server is the IDE and must stay alive
  is_known_pid "$script_pid" && continue
  started=$(ps -p "$script_pid" -o lstart= 2>/dev/null | xargs)
  add_agent "antigravity $role (wait-script, started $started)" "$script_pid"
done < <(ps aux | grep "antigravity_wait_for_" | grep -v grep || true)

# ── Cursor: pid-file based (write script runs inside Claude Code process) ──────
for pidfile in "$RUNTIME_DIR"/cursor_*.pid; do
  [[ -f "$pidfile" ]] || continue
  pid=$(cat "$pidfile" 2>/dev/null | tr -d '[:space:]')
  name=$(basename "$pidfile" .pid | sed 's/cursor_/cursor /')
  add_agent "$name (pid-file)" "$pid"
done

# ── Codex: supervisor pid-file or running process ────────────────────────────
for pidfile in "$RUNTIME_DIR"/codex_*_supervisor.pid; do
  [[ -f "$pidfile" ]] || continue
  pid=$(cat "$pidfile" 2>/dev/null | tr -d '[:space:]')
  name=$(basename "$pidfile" .pid | sed 's/codex_/codex /' | sed 's/_supervisor//')
  add_agent "$name (pid-file)" "$pid"
done
while IFS= read -r line; do
  pid=$(echo "$line" | awk '{print $2}')
  is_known_pid "$pid" && continue
  role=$(echo "$line" | grep -o "codex_supervisor\.sh [a-z]*" | awk '{print $2}')
  add_agent "codex ${role:-supervisor} (no pid-file)" "$pid"
done < <(ps aux | grep "codex_supervisor" | grep -v grep || true)

# ── Codex.app chat: cheap role waiters, not codex exec ──────────────────────
for pidfile in "$RUNTIME_DIR"/codex_app_*.pid; do
  [[ -f "$pidfile" ]] || continue
  pid=$(cat "$pidfile" 2>/dev/null | tr -d '[:space:]')
  name=$(basename "$pidfile" .pid | sed 's/codex_app_/codex_app /')
  add_agent "$name (pid-file)" "$pid"
done
while IFS= read -r line; do
  pid=$(echo "$line" | awk '{print $2}')
  is_known_pid "$pid" && continue
  role=$(echo "$line" | grep -o "codex_app_wait_for_status\.py [A-Za-z]*" | awk '{print $2}')
  add_agent "codex_app ${role:-waiter} (no pid-file)" "$pid"
done < <(ps aux | grep "codex_app_wait_for_status.py" | grep -v grep || true)

# ── Claude Code: unknown (chat sessions etc) ─────────────────────────────────
while IFS= read -r line; do
  pid=$(echo "$line" | awk '{print $2}')
  is_known_pid "$pid" && continue
  add_agent "⚠ unknown role (chat?)" "$pid"
done < <(ps aux | grep "native-binary/claude" | grep -v grep || true)

# ── nothing found ────────────────────────────────────────────────────────────
if [[ ${#PIDS[@]} -eq 0 ]]; then
  echo "No active agent processes found."
  exit 0
fi

# ── print pipeline status ────────────────────────────────────────────────────
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

# ── list available agents ────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  ACTIVE AGENT PROCESSES"
echo "═══════════════════════════════════════════════════════════════════════════"
printf "  %-4s  %-7s  %-28s  %-8s  %-30s  %s\n" "ID" "PID" "ROLE" "ELAPSED" "WORKSPACE" "STARTED"
echo "  ─────────────────────────────────────────────────────────────────────────"
for i in "${!PIDS[@]}"; do
  pid="${PIDS[$i]}"
  label="${LABELS[$i]}"
  cwd=$(lsof -p "$pid" 2>/dev/null | awk '/cwd/{print $NF}' | head -1)
  workspace=$(echo "$cwd" | awk -F'/' '{print $(NF-1)"/"$NF}')
  started=$(ps -p "$pid" -o lstart= 2>/dev/null | xargs)
  elapsed=$(ps -p "$pid" -o etime= 2>/dev/null | xargs)
  printf "  [%d]   %-7s  %-28s  %-8s  %-30s  %s\n" \
    "$((i+1))" "$pid" "$label" "$elapsed" "$workspace" "$started"
done
echo "  [0]   Cancel"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# ── prompt ───────────────────────────────────────────────────────────────────
read -rp "Select agent to kill [0-${#PIDS[@]}]: " choice

if [[ "$choice" == "0" || -z "$choice" ]]; then
  echo "Cancelled."
  exit 0
fi

if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#PIDS[@]} )); then
  echo "Invalid selection."
  exit 1
fi

idx=$(( choice - 1 ))
target_pid="${PIDS[$idx]}"
target_label="${LABELS[$idx]}"

echo ""
echo "  Target : $target_label  (PID $target_pid)"
read -rp "  Confirm kill? [y/N]: " confirm

if [[ "${confirm,,}" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

kill "$target_pid" && echo "  ✓ Sent SIGTERM to PID $target_pid ($target_label)" || echo "  ✗ Failed to kill PID $target_pid"

# clean up stale pid-file if applicable
for pidfile in "$RUNTIME_DIR"/*.pid; do
  [[ -f "$pidfile" ]] || continue
  stored=$(cat "$pidfile" 2>/dev/null | tr -d '[:space:]')
  if [[ "$stored" == "$target_pid" ]]; then
    rm -f "$pidfile"
    echo "  ✓ Removed stale pid-file: $pidfile"
  fi
done

# clean up heartbeat files for this role
role_lower=$(echo "$target_label" | grep -o '[A-Za-z]*' | tr '[:upper:]' '[:lower:]' | grep -E "architect|designer|developer|tester" | head -1)
if [[ -n "$role_lower" ]]; then
  hb_file="$RUNTIME_DIR/heartbeat_${role_lower}.json"
  if [[ -f "$hb_file" ]]; then
    rm -f "$hb_file"
    echo "  ✓ Removed heartbeat: $hb_file"
  fi
fi
