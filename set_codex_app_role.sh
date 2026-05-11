#!/usr/bin/env bash
# Select which pipeline role this Codex.app chat heartbeat should act as.

set -euo pipefail

ROLE_INPUT="${1:-}"
ROLE_INPUT_LC="$(printf '%s' "$ROLE_INPUT" | tr '[:upper:]' '[:lower:]')"

case "$ROLE_INPUT_LC" in
  architect) ROLE="Architect" ;;
  designer) ROLE="Designer" ;;
  developer) ROLE="Developer" ;;
  tester) ROLE="Tester" ;;
  *)
    echo "Usage: bash set_codex_app_role.sh [architect|designer|developer|tester]"
    exit 1
    ;;
esac

RUNTIME_DIR="multi-agent/.runtime"
CONFIG_FILE="$RUNTIME_DIR/codex_app_current_role.json"
STATE_FILE="$RUNTIME_DIR/codex_app_${ROLE_INPUT_LC}.state.json"

mkdir -p "$RUNTIME_DIR"

python3 - "$CONFIG_FILE" "$STATE_FILE" "$ROLE" "$ROLE_INPUT_LC" "$RUNTIME_DIR" <<'PYEOF'
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

config_path = Path(sys.argv[1])
state_path = Path(sys.argv[2])
role = sys.argv[3]
role_lower = sys.argv[4]
runtime_dir = Path(sys.argv[5])
now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

config = {
    "role": role,
    "role_lower": role_lower,
    "mode": "codex_app_chat",
    "strategy": "heartbeat_direct_status_check",
    "last_updated": now,
}
tmp = config_path.with_suffix(config_path.suffix + ".tmp")
tmp.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
tmp.replace(config_path)

for other in ("architect", "designer", "developer", "tester"):
    if other == role_lower:
        continue
    other_path = runtime_dir / f"codex_app_{other}.state.json"
    if not other_path.exists():
        continue
    try:
        other_state = json.loads(other_path.read_text(encoding="utf-8"))
    except Exception:
        other_state = {}
    other_state.update({
        "state": "inactive",
        "signal_received": False,
        "wait_pid": None,
        "selected": False,
        "last_updated": now,
    })
    tmp = other_path.with_suffix(other_path.suffix + ".tmp")
    tmp.write_text(json.dumps(other_state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(other_path)

state = {}
if state_path.exists():
    try:
        state = json.loads(state_path.read_text(encoding="utf-8"))
    except Exception:
        state = {}
state.update({
    "role": role,
    "mode": "codex_app_chat",
    "strategy": "heartbeat_direct_status_check",
    "state": "polling",
    "signal_received": False,
    "wait_pid": None,
    "last_updated": now,
    "last_heartbeat_at": now,
})
tmp = state_path.with_suffix(state_path.suffix + ".tmp")
tmp.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
tmp.replace(state_path)
PYEOF

echo "Selected Codex.app role: $ROLE"
echo "Config: $CONFIG_FILE"
echo "State:  $STATE_FILE"
