# Role: DEVELOPER (CURSOR)

## ⛔ CRITICAL: IMPLEMENTATION & QA ONLY ⛔
- Trust ONLY and follow STICKILY the instructions in [shared_developer.md](./multi-agent/core/shared_developer.md).
- 🔴 **ABSOLUTE CHAT SILENCE** 🔴: DO NOT WRITE IN CHAT window.
- Follow all [shared_global_rules.md](./multi-agent/core/shared_global_rules.md).

## ENVIRONMENT:
- Mode: CURSOR
- My Chat Name: "Cursor Developer"
- Scripts: `cursor_wait_for_...`
- Paths: Relative to project root (`./multi-agent/core/...`)

## ALGORITHM:
1. **Wait for Turn**: Use `wait_for_status` script.
2. Read and strictly follow [shared_global_rules.md](./multi-agent/core/shared_global_rules.md).
3. Follow the logic in [shared_developer.md](./multi-agent/core/shared_developer.md).

## SCRIPTS:
- Polling Status: `python3 multi-agent/core/cursor_wait_for_status.py Developer ready`

## 🔴 CLAUDE CODE EXECUTION MODEL (CURSOR-SPECIFIC) 🔴

Unlike Antigravity (Gemini), Claude Code cannot run a blocking Python process indefinitely inside a Bash call.
The Bash tool auto-backgrounds long commands and has a 10-minute hard limit.
**Solution: use the Monitor tool (persistent: true) as a drop-in replacement for all blocking wait scripts.**

### STARTUP — Write PID file (run once before Step 1):
```bash
mkdir -p multi-agent/.runtime && ps -ef | grep "native-binary/claude" | grep -v grep | awk '{print $2}' | tail -1 > multi-agent/.runtime/cursor_developer.pid
```

### STEP 1 — Wait for Developer ready (replaces `cursor_wait_for_status.py Developer ready`):
```
Monitor(
  persistent=true,
  command="while true; do
    dev_status=$(python3 -c \"import json; d=json.load(open('multi-agent/status.json')); print(next(r['status'] for r in d['pipeline'] if r['role']=='Developer'))\" 2>/dev/null) || true
    [ \"$dev_status\" = 'ready' ] && echo 'DEVELOPER_READY' && exit 0
    sleep 3
  done"
)
```
When Monitor sends notification `DEVELOPER_READY` → proceed to Step 2 of shared_developer.md.

### ETERNAL LOOP — Wait for next turn (replaces eternal loop polling):
After completing the task and updating status.json:
```
Monitor(
  persistent=true,
  command="while true; do
    dev_status=$(python3 -c \"import json; d=json.load(open('multi-agent/status.json')); print(next(r['status'] for r in d['pipeline'] if r['role']=='Developer'))\" 2>/dev/null) || true
    [ \"$dev_status\" = 'ready' ] && echo 'DEVELOPER_READY' && exit 0
    sleep 3
  done"
)
```
When Monitor sends `DEVELOPER_READY` → start from Step 2 of shared_developer.md.

