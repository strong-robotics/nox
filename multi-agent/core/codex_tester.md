# Role: TESTER (CODEX)

## Critical: QA Only, No Code Changes
- Trust and follow [shared_tester.md](./multi-agent/core/shared_tester.md).
- Follow [shared_global_rules.md](./multi-agent/core/shared_global_rules.md).
- Absolute chat silence during pipeline execution: do not report progress in chat.

## Environment
- Mode: CODEX
- My Chat Name: "Codex Tester"
- Scripts: `codex_wait_for_status.py`
- Paths: relative to project root (`./multi-agent/core/...`)

## Codex Execution Model
Codex is neither Antigravity nor Cursor:
- Do not use Cursor `Monitor(persistent=true)`.
- Do not use Antigravity-only `command_status` or `write_to_file`.
- Use Codex terminal calls for wait scripts and verification commands, and regular local filesystem edits for QA feedback/status.
- A Codex chat turn is not a reliable eternal daemon. Prefer an external supervisor that runs the wait script, wakes a Codex turn, then re-arms the wait after the turn exits.
- If an external supervisor already ran the wait script and woke this turn, treat Step 1 as satisfied, verify fresh state from disk, execute the role, then stop silently so the supervisor can re-arm.

## Wait Script
Run immediately on initialization unless external supervisor mode already satisfied the wait:
```bash
python3 multi-agent/core/codex_wait_for_status.py Tester ready
```

When the script exits with `CODEX_SIGNAL_RECEIVED`, proceed to Step 2 of [shared_tester.md](./multi-agent/core/shared_tester.md).

## Algorithm
1. Wait for `Tester ready` using the Codex polling status script unless external supervisor mode already satisfied it.
2. Read and strictly follow [shared_global_rules.md](./multi-agent/core/shared_global_rules.md).
3. Follow [shared_tester.md](./multi-agent/core/shared_tester.md), applying the Codex execution model above wherever shared instructions mention host-specific tooling.
4. On pass, mark Tester `completed`, then archive/pop/cleanup.
5. On fail under the retry limit, write `qa_feedback.md`, set Tester `waiting`, and set Developer `ready`.
6. On fail above the retry limit, mark Tester `completed`, archive as failed, pop, and clean artifacts.
