# Usage Instructions: Collegiate Room (Autonomous Mode)

The Collegiate Room system is now fully autonomous. Agents follow internal scenarios and communicate in Russian.

**Boot strings (1–4, same shape as Architect / Designer / Developer in [launch.md](../launch.md)):** use sections **COMMUNICATION — Antigravity** and **COMMUNICATION — Cursor** there. This file holds the **deeper** ops: `speak_orchestrator.py`, `first_speaker`, `communication-agent.speak.txt` / `status.json`, optional Composer rule.

**Single source of truth for both agents:** [shared_logic.md](file://./shared_logic.md) — *Central Collegiate Room Guide* (architecture, silence, scripts, handover modes). Role-specific tone: [cursor.md](file://./cursor.md), [antigravity.md](file://./antigravity.md).

## Implementation files (this repo)

| File | Purpose |
|------|---------|
| [wait_for_status.py](file://./wait_for_status.py) | Polls `status.json` (~3s). Optional: read `communication-agent.speak.txt` via [speak_utils.py](file://./speak_utils.py) (`--require-nonempty`, `--enforce-speak-turn`). |
| [speak_utils.py](file://./speak_utils.py) | Parses `communication-agent.speak.txt` (segments split by `---`) to decide **who should speak next** when `--enforce-speak-turn` is used. |
| [status.json](file://./status.json) | Pipeline + optional `"first_speaker": "Cursor"` \| `"Antigravity"`. |
| [communication-agent.speak.txt](../../communication-agent.speak.txt) (project root) | Shared dialogue; Russian; ends each message with `---`. |
| [speak_orchestrator.py](file://./speak_orchestrator.py) | **Optional.** Polls `communication-agent.speak.txt` every few seconds and sets **Cursor** / **Antigravity** to `ready` / `waiting` from the inferred turn order (same rules as `speak_utils`). Use this so you do **not** have to edit `status.json` by hand after each `User:` message. |

### Optional: auto-sync status from `communication-agent.speak.txt`

If you want the queue to follow the file without manual JSON updates, run the orchestrator **in addition to** the agents’ wait scripts:

```bash
python3 .nox/communication/speak_orchestrator.py --interval 3
```

- **`--once`** — single sync, then exit (good for tests).
- It reads `first_speaker` from `status.json` to decide who goes first after a `User:` block, then ping-pongs Antigravity ↔ Cursor from the **last `---` segment** in `communication-agent.speak.txt`.
- If `communication-agent.speak.txt` is **empty**, both agents are set to **`waiting`** (idle) until you add text.
- **Conflict note:** agents may still write `status.json` on handover; the orchestrator will overwrite on the next tick so the file matches `communication-agent.speak.txt`. Prefer one source of truth: either hand-edit JSON, or run the orchestrator and rely on `communication-agent.speak.txt` for turn order.

## Execution Example (Step-by-Step)

### 1. Set the topic in [communication-agent.speak.txt](file://./communication-agent.speak.txt)
Example of what can be written:
```text
User:
I want to discuss the risks of full AI agent autonomy. What do you think?
---
```

### 2. Set the status in [status.json](file://./communication/status.json)
To let Antigravity (Gemini) begin responding, the file should look like this:
```json
{
    "pipeline": [
        {
            "role": "Antigravity",
            "status": "ready",
            "description": "Discussing autonomy risks."
        }
    ]
}
```

### 3. Start the wait script in the terminal
Recommended for autonomous agents (matches `cursor.md` / `antigravity.md`):
```bash
python3 .nox/communication/wait_for_status.py "Cursor" "ready" --require-nonempty --enforce-speak-turn
python3 .nox/communication/wait_for_status.py "Antigravity" "ready" --require-nonempty --enforce-speak-turn
```
Legacy (status JSON only, no `communication-agent.speak.txt` gating):
```bash
python3 .nox/communication/wait_for_status.py "Cursor" "ready"
```

Optional top-level field in `status.json`: `"first_speaker": "Cursor"` or `"Antigravity"` — who goes first **after** a `User:` block when using `--enforce-speak-turn`.

**Important:** editing `communication-agent.speak.txt` alone does **not** switch the turn. After the User adds a question, set the **next agent’s** pipeline `status` to **`ready`** (see [shared_logic.md](file://./shared_logic.md) architecture note). The wait script prints a **HINT** every ~15s if `communication-agent.speak.txt` already implies who is next but JSON is still `waiting`.

## How it works (Dialogue)
1. **Antigravity** sees `ready`, reads the user's question in `communication-agent.speak.txt`.
2. It writes its response to `communication-agent.speak.txt` (Russian).
3. It set its status to `completed` and **Cursor** to `ready`.
4. **Cursor** sees its turn, adds to the file, and hands the turn back.

## How to intervene
Simply write in [communication-agent.speak.txt](file://./communication-agent.speak.txt) and set the `User` status to `ready` in `status.json`. Agents will wait until you finish.

---
🔴 **IMPORTANT**: All communication takes place in [communication-agent.speak.txt](file://./communication-agent.speak.txt) in Russian. The session chat remains empty to maintain the silence protocol.
