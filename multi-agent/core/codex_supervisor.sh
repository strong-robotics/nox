#!/usr/bin/env bash
# Supervisor for Codex agents.
# Owns the eternal wait loop, then launches one non-interactive Codex turn after a signal.
#
# Usage (run from project root):
#   bash multi-agent/core/codex_supervisor.sh architect
#   bash multi-agent/core/codex_supervisor.sh designer
#   bash multi-agent/core/codex_supervisor.sh developer
#   bash multi-agent/core/codex_supervisor.sh tester

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ROLE="${1:-}"
if [[ -z "$ROLE" ]]; then
  echo "Usage: bash multi-agent/core/codex_supervisor.sh <architect|designer|developer|tester>"
  exit 1
fi

CODEX_BIN="${CODEX_BIN:-/Applications/Codex.app/Contents/Resources/codex}"
CODEX_MODEL="${CODEX_MODEL:-gpt-5.5}"

if [[ ! -x "$CODEX_BIN" ]]; then
  if command -v codex >/dev/null 2>&1; then
    CODEX_BIN="$(command -v codex)"
  else
    echo "Codex binary not found. Set CODEX_BIN or install Codex.app/CLI."
    exit 1
  fi
fi

case "$ROLE" in
  architect)
    ROLE_NAME="Architect"
    SHARED_FILE="./multi-agent/core/shared_architect.md"
    CODEX_FILE="./multi-agent/core/codex_architect.md"
    WAIT_COMMAND="python3 multi-agent/core/codex_wait_for_task.py"
    ;;
  designer)
    ROLE_NAME="Designer"
    SHARED_FILE="./multi-agent/core/shared_designer.md"
    CODEX_FILE="./multi-agent/core/codex_designer.md"
    WAIT_COMMAND="python3 multi-agent/core/codex_wait_for_status.py Designer ready"
    ;;
  developer)
    ROLE_NAME="Developer"
    SHARED_FILE="./multi-agent/core/shared_developer.md"
    CODEX_FILE="./multi-agent/core/codex_developer.md"
    WAIT_COMMAND="python3 multi-agent/core/codex_wait_for_status.py Developer ready"
    ;;
  tester)
    ROLE_NAME="Tester"
    SHARED_FILE="./multi-agent/core/shared_tester.md"
    CODEX_FILE="./multi-agent/core/codex_tester.md"
    WAIT_COMMAND="python3 multi-agent/core/codex_wait_for_status.py Tester ready"
    ;;
  *)
    echo "Unknown role: $ROLE. Use: architect | designer | developer | tester"
    exit 1
    ;;
esac

PROMPT="COMMAND: RESUME ROLE [$ROLE_NAME - CODEX EXTERNAL SUPERVISOR].
1. LOAD instructions from \`$SHARED_FILE\`, \`$CODEX_FILE\`, and \`./multi-agent/core/shared_global_rules.md\`.
2. TRUST that this external supervisor has ALREADY executed and waited on \`$WAIT_COMMAND\`, and it returned successfully just now.
3. DO NOT run the long polling script again at the start of this Codex turn. The wake condition is already satisfied.
4. Verify fresh state from disk with \`cat ./multi-agent/status.json\` and execute the $ROLE_NAME role immediately.
5. After you finish this role step and update pipeline state/artifacts, STOP SILENTLY. The external supervisor will restart \`$WAIT_COMMAND\`.
6. OBSERVE 'BLOOD SILENT' MANDATE for user chat: NO chat, NO summaries, NO reports. Completion is signaled only through files/status. If assistant text is unavoidable, output ONLY \`NO_REPLY\`."

echo "[SUPERVISOR] Starting Codex $ROLE loop (workspace-write sandbox)"
echo "[SUPERVISOR] Project root: $ROOT_DIR"
echo "[SUPERVISOR] Wait command: $WAIT_COMMAND"
echo "[SUPERVISOR] Codex binary: $CODEX_BIN"
echo "[SUPERVISOR] Codex model: $CODEX_MODEL"
echo "[SUPERVISOR] Press Ctrl+C to stop"
echo ""

CODEX_OUTPUT_TMP="$ROOT_DIR/multi-agent/.runtime/codex_${ROLE}_last_output.tmp"
CONSECUTIVE_FAILURES=0
MAX_CONSECUTIVE_FAILURES=3

ITERATION=0
while true; do
  ITERATION=$((ITERATION + 1))
  echo "[SUPERVISOR] >>> Iteration $ITERATION — waiting for $ROLE_NAME signal"
  set +e
  bash -lc "$WAIT_COMMAND"
  WAIT_EXIT_CODE=$?
  set -e

  if [[ $WAIT_EXIT_CODE -eq 130 || $WAIT_EXIT_CODE -eq 143 ]]; then
    echo "[SUPERVISOR] Wait interrupted, exiting"
    exit "$WAIT_EXIT_CODE"
  fi

  if [[ $WAIT_EXIT_CODE -ne 0 ]]; then
    echo "[SUPERVISOR] Wait command exited with $WAIT_EXIT_CODE — retrying in 2s"
    sleep 2
    continue
  fi

  echo "[SUPERVISOR] >>> Signal received — launching Codex $ROLE_NAME"
  set +e
  "$CODEX_BIN" exec --full-auto -s workspace-write --skip-git-repo-check -m "$CODEX_MODEL" -C "$ROOT_DIR" "$PROMPT" 2>&1 | tee "$CODEX_OUTPUT_TMP"
  CODEX_EXIT_CODE=${PIPESTATUS[0]}
  set -e

  # Detect fatal errors that codex sometimes reports with exit code 0
  if grep -qE "400 Bad Request|requires a newer version|You've hit your usage limit|usage limit" "$CODEX_OUTPUT_TMP" 2>/dev/null; then
    echo "[SUPERVISOR] Fatal Codex error detected in output — stopping supervisor"
    exit 1
  fi

  if [[ $CODEX_EXIT_CODE -ne 0 ]]; then
    echo "[SUPERVISOR] Codex $ROLE_NAME exited with $CODEX_EXIT_CODE — stopping supervisor to avoid a fast failure loop"
    exit "$CODEX_EXIT_CODE"
  fi

  # Safety net: if status didn't change, Codex did nothing — count as failure
  CURRENT_STATUS=$(python3 -c "import json; d=json.load(open('multi-agent/status.json')); print(next(r['status'] for r in d['pipeline'] if r['role']=='$ROLE_NAME'))" 2>/dev/null || echo "unknown")
  if [[ "$CURRENT_STATUS" == "ready" ]]; then
    CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
    echo "[SUPERVISOR] WARNING: $ROLE_NAME status still 'ready' after Codex turn (no-op #$CONSECUTIVE_FAILURES)"
    if [[ $CONSECUTIVE_FAILURES -ge $MAX_CONSECUTIVE_FAILURES ]]; then
      echo "[SUPERVISOR] $MAX_CONSECUTIVE_FAILURES consecutive no-ops — stopping supervisor"
      exit 1
    fi
    sleep 10
    continue
  fi

  CONSECUTIVE_FAILURES=0
  echo "[SUPERVISOR] <<< Codex $ROLE_NAME exited — re-arming wait in 2s"
  sleep 2
done
