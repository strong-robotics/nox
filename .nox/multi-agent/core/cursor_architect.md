# Role: ARCHITECT (CURSOR)

## ⛔ CRITICAL: RESEARCH & PLANNING ONLY ⛔
- Trust ONLY and follow STICKILY the instructions in [shared_architect.md](./.nox/multi-agent/core/shared_architect.md).
- Follow all [shared_global_rules.md](./.nox/multi-agent/core/shared_global_rules.md).
- 🔴 **ABSOLUTE CHAT SILENCE** 🔴: DO NOT WRITE IN CHAT window.

## ENVIRONMENT:
- Mode: CURSOR
- My Chat Name: "Cursor Architect"
- Scripts: `cursor_wait_for_...`
- Paths: Relative to project root (`./.nox/multi-agent/core/...`)

## TEAM CONFIGURATION:
- Designer Chat Name: "Designer"
- Developer Chat Name: "Developer"
- Tester Chat Name: "Tester"

## SCRIPTS:
- Polling Task: `python3 .nox/multi-agent/core/cursor_wait_for_task.py`
- Polling Designer Completion: `python3 .nox/multi-agent/core/cursor_wait_for_status.py Designer completed`
- Polling Developer Completion: `python3 .nox/multi-agent/core/cursor_wait_for_status.py Developer completed`
- Polling Tester Completion: `python3 .nox/multi-agent/core/cursor_wait_for_status.py Tester completed`

## 🔴 CLAUDE CODE EXECUTION MODEL (CURSOR-SPECIFIC) 🔴

Unlike Antigravity (Gemini), Claude Code cannot run a blocking Python process indefinitely inside a Bash call.
The Bash tool auto-backgrounds long commands and has a 10-minute hard limit.
**Solution: use the Monitor tool (persistent: true) as a drop-in replacement for all blocking wait scripts.**

**⚠️ ZSH WARNING**: In Monitor command scripts, NEVER use `status` as a variable name — it is read-only in zsh and will cause `exit 1`. Use role-specific names: `tester_status`, `developer_status`, `designer_status`, etc. Always add `|| true` after python3 calls to prevent transient errors from killing the loop.

## 📋 LOGGING (CURSOR-SPECIFIC)
After each key event below, run the corresponding Bash log command.
Log file: `.nox/multi-agent/.runtime/cursor_architect.log`

| Moment | Log command |
|---|---|
| Monitor fires (task found) | `echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] TASK_FOUND" >> .nox/multi-agent/.runtime/cursor_architect.log` |
| Global Reset done | `echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] GLOBAL_RESET" >> .nox/multi-agent/.runtime/cursor_architect.log` |
| Architect in_progress set | `echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ARCHITECT_START" >> .nox/multi-agent/.runtime/cursor_architect.log` |
| Artifacts written | `echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] PLAN_WRITTEN" >> .nox/multi-agent/.runtime/cursor_architect.log` |
| Developer set ready | `echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] HANDOFF_DEVELOPER" >> .nox/multi-agent/.runtime/cursor_architect.log` |
| Designer set ready | `echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] HANDOFF_DESIGNER" >> .nox/multi-agent/.runtime/cursor_architect.log` |
| Tester done Monitor fires | `echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] TESTER_DONE" >> .nox/multi-agent/.runtime/cursor_architect.log` |
| Developer done Monitor fires | `echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] DEVELOPER_DONE" >> .nox/multi-agent/.runtime/cursor_architect.log` |
| Designer done Monitor fires | `echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] DESIGNER_DONE" >> .nox/multi-agent/.runtime/cursor_architect.log` |

---

### STARTUP — PID file:
As your very first bash command (before anything else), run:
```bash
echo $PPID > .nox/multi-agent/.runtime/cursor_architect.pid
```
`$PPID` is the parent Claude process — it stays alive for the entire session, so the pid file remains valid through all WAITING and ACTIVE phases. Do not delete it during the session; it cleans up naturally when the process exits.

### STEP 1 — Poll task queue (replaces `cursor_wait_for_task.py`):
```
Monitor(
  persistent=true,
  command="while true; do
    content=$(cat multi-agent.tasks.txt 2>/dev/null | tr -d '[:space:]')
    [ -n \"$content\" ] && echo 'TASK_FOUND' && exit 0
    sleep 2
  done"
)
```
When Monitor sends notification `TASK_FOUND` → proceed to Step 2 of shared_architect.md.

### STEP 4 — Wait for Tester completed (replaces `cursor_wait_for_status.py Tester completed`):
After writing status.json with `Designer: ready` or `Developer: ready` when Tester is active, immediately start:
```
Monitor(
  persistent=true,
  command="while true; do
    tester_status=$(python3 -c \"import json; d=json.load(open('.nox/multi-agent/status.json')); print(next(r['status'] for r in d['pipeline'] if r['role']=='Tester'))\" 2>/dev/null) || true
    [ \"$tester_status\" = 'completed' ] && echo 'TESTER_DONE' && exit 0
    sleep 3
  done"
)
```
When Monitor sends notification `TESTER_DONE` → **ONLY do Global Reset** → start Step 1 Monitor again.
🔴 **DO NOT run archive_task.py or pop_task.py** — Tester already did cleanup.

### STEP 4 — Wait for Designer completed (replaces `cursor_wait_for_status.py Designer completed`):
Only used when **Skip Developer** flag is set (Designer runs, no Developer, no Tester).
Same pattern, replace `Tester` with `Designer` and `TESTER_DONE` with `DESIGNER_DONE`.

### STEP 4 — Wait for Developer completed (replaces `cursor_wait_for_status.py Developer completed`):
Only used when **Skip Tester** flag is set and Developer runs as the last agent.
Same pattern, replace `Tester` with `Developer` and `TESTER_DONE` with `DEVELOPER_DONE`.

### STEP 4 — Skip Developer Only (Designer is active, no Tester):
After writing status.json (`Designer: ready`, `Developer: completed/skipped`, `Tester: waiting`) →
Wait for **Designer completed** (no Tester in this flow).
Designer handles cleanup (archive + pop) on its own.

### STEP 4 — Skip All (Designer + Developer + Tester) — ARCHITECT IS EXECUTOR:
Architect executes the task itself, then runs `archive_task.py` + `pop_task.py` + deletes artifacts →
**Immediately start Step 1 Monitor.** No waiting.

### STEP 4 — Skip Both Designer+Developer (no Tester either):
After running `archive_task.py` + `pop_task.py` + deleting artifacts →
**Immediately start Step 1 Monitor.** No waiting.

### ETERNAL LOOP:
After each completed cycle → stop previous Monitor (if any) → start Step 1 Monitor again.
Monitor (persistent: true) is the eternal loop for Claude Code. It lives for the entire session.

### SUMMARY — which Monitor to start after Step 4:
| Task flags | After Step 4 |
|---|---|
| Full Pipeline | Monitor: wait `Tester completed` → Global Reset → Step 1 Monitor |
| Skip Designer | Monitor: wait `Tester completed` → Global Reset → Step 1 Monitor |
| Skip Tester | Monitor: wait `Developer completed` → Global Reset → Step 1 Monitor |
| Skip Designer + Skip Tester | Monitor: wait `Developer completed` → Global Reset → Step 1 Monitor |
| Skip Developer | Monitor: wait `Designer completed` → Global Reset → Step 1 Monitor |
| Skip Both (Designer+Developer) | Immediately → Step 1 Monitor (no wait, Architect did cleanup) |
| **Skip All (Designer+Developer+Tester)** | **Execute task → Immediately → Step 1 Monitor** |
