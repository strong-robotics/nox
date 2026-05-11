#!/usr/bin/env bash
# Show Codex.app chat waiter state for one role or all roles.

set -euo pipefail

RUNTIME_DIR="multi-agent/.runtime"

print_role() {
  local role_lower="$1"
  local role_upper
  role_upper="$(printf '%s' "$role_lower" | tr '[:lower:]' '[:upper:]')"
  local pid_file="$RUNTIME_DIR/codex_app_${role_lower}.pid"
  local state_file="$RUNTIME_DIR/codex_app_${role_lower}.state.json"
  local pid="-"
  local live="no"

  if [[ -f "$pid_file" ]]; then
    pid="$(tr -d '[:space:]' < "$pid_file")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      live="yes"
    fi
  fi

  echo ""
  echo "CODEX APP $role_upper"
  echo "  PID live : $live"
  echo "  PID      : $pid"
  echo "  State    : $state_file"
  if [[ -f "$state_file" ]] && command -v python3 >/dev/null 2>&1; then
    python3 - "$state_file" <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
for key in ("state", "signal_received", "current_status", "run_id", "last_updated", "claimed_at", "wait_pid"):
    if key in data:
        print(f"  {key:<15}: {data[key]}")
PYEOF
  else
    echo "  state    : missing"
  fi
}

if [[ "${1:-all}" == "all" ]]; then
  for role in architect designer developer tester; do
    print_role "$role"
  done
else
  role_input_lc="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  case "$role_input_lc" in
    architect|designer|developer|tester) print_role "$role_input_lc" ;;
    *)
      echo "Usage: bash status_codex_app.sh [all|architect|designer|developer|tester]"
      exit 1
      ;;
  esac
fi
