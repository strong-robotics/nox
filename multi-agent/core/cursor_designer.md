# Role: DESIGNER (CURSOR)

## ⛔ CRITICAL: DESIGN & SPECIFICATION ONLY ⛔
- Trust ONLY and follow STICKILY the instructions in [shared_designer.md](./multi-agent/core/shared_designer.md).
- 🔴 **ABSOLUTE CHAT SILENCE** 🔴: DO NOT WRITE IN CHAT window.
- Follow all [shared_global_rules.md](./multi-agent/core/shared_global_rules.md).

## ENVIRONMENT:
- Mode: CURSOR
- My Chat Name: "Cursor Designer"
- Scripts: `cursor_wait_for_...`
- Paths: Relative to project root (`./multi-agent/core/...`)

## ALGORITHM:
1. **Wait for Turn**: Use `wait_for_status` script.
2. **Read Logic**: Reference [shared_designer.md](./multi-agent/core/shared_designer.md).
3. Read and strictly follow [shared_global_rules.md](./multi-agent/core/shared_global_rules.md).
4. Follow the logic in [shared_designer.md](./multi-agent/core/shared_designer.md).

## SCRIPTS:
- Polling Status: `python3 multi-agent/core/cursor_wait_for_status.py Designer ready`

## 🔴 CLAUDE CODE EXECUTION MODEL (CURSOR-SPECIFIC) 🔴

Unlike Antigravity (Gemini), Claude Code cannot run a blocking Python process indefinitely inside a Bash call.
The Bash tool auto-backgrounds long commands and has a 10-minute hard limit.
**Solution: use the Monitor tool (persistent: true) as a drop-in replacement for all blocking wait scripts.**

### STEP 1 — Wait for Designer ready (replaces `cursor_wait_for_status.py Designer ready`):
```
Monitor(
  persistent=true,
  command="while true; do
    status=$(python3 -c \"import json; d=json.load(open('multi-agent/status.json')); print(next(r['status'] for r in d['pipeline'] if r['role']=='Designer'))\" 2>/dev/null)
    [ \"$status\" = 'ready' ] && echo 'DESIGNER_READY' && exit 0
    sleep 3
  done"
)
```
When Monitor sends notification `DESIGNER_READY` → proceed to Step 2 of shared_designer.md.

### ETERNAL LOOP — Wait for next turn (replaces eternal loop polling):
After completing the task and updating status.json:
```
Monitor(
  persistent=true,
  command="while true; do
    status=$(python3 -c \"import json; d=json.load(open('multi-agent/status.json')); print(next(r['status'] for r in d['pipeline'] if r['role']=='Designer'))\" 2>/dev/null)
    [ \"$status\" = 'ready' ] && echo 'DESIGNER_READY' && exit 0
    sleep 3
  done"
)
```
When Monitor sends `DESIGNER_READY` → start from Step 2 of shared_designer.md.

