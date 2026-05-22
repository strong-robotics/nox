#!/usr/bin/env bash
# Stop all 4 pipeline roles across all environments (Antigravity, Cursor, Codex, Codex.app).
# Does NOT touch unrelated AI processes.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ROLES=(architect designer developer tester)

for role in "${ROLES[@]}"; do
  bash scripts/stop_antigravity.sh "$role"
  bash scripts/stop_cursor.sh "$role"
  bash scripts/stop_codex.sh "$role"
  bash scripts/stop_codex_app.sh "$role"
done

echo ""
echo "Pipeline stopped. Run 'bash scripts/agents.sh' to verify."
