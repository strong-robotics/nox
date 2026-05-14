# Nox Multi-Agent — Developer Manual

## How to add a task to the queue

Tasks are stored in `multi-agent.tasks.txt` at the project root.
Each task is a block delimited by `--- task N` and `---`.

### Minimal task

```
--- task 1
Action: Fix the null check in UserService
---
```

### Full task (all fields)

```
--- task 2
Action: Add "Buy now" button to product card with purchase flow
Linear: SHOP-187
Stack: Next.js
Language: English
Skip Designer: False
Skip Developer: False
Instructions: Button should open a modal with a quantity selector. Use the existing CartService. A similar button already exists in components/ProductList — reuse that pattern.
---
```

---

## Field reference

| Field | Required | Description |
|---|---|---|
| `Action:` | ✅ | What needs to be done — the main goal of the task |
| `Linear:` | no | Linear issue ID (e.g. `SHOP-42`). The Architect will fetch full details via API |
| `Stack:` | no | Technology stack: `Next.js`, `Flutter`, `Node.js`, etc. Used to run the correct build/lint commands |
| `Language:` | no | Language for all artifacts and QA feedback: `English`, `Ukrainian`, `Russian`, etc. |
| `Skip Designer:` | no | `True` — skip the Designer, go straight to Developer |
| `Skip Tester:` | no | `True` — skip QA verification, Developer is the last agent (useful when no build env is available) |
| `Max QA Retries:` | no | Max Developer→Tester retry cycles before marking task `failed` (default: **3**) |
| `Skip Developer:` | no | `True` — skip Developer **and** Tester (design/research only) |
| `Instructions:` | no | Background context, hints, file paths to check, patterns to reuse |

---

## Pipeline overview

```
Architect → Designer → Developer → Tester → [next task]
```

- **Architect**: reads the task block, researches the codebase, writes `implementation_plan.md` and `task.md`
- **Designer**: reads the plan, writes a spec in `multi-agent/core/specs/`
- **Developer**: reads the plan + spec, implements the code, hands off to Tester
- **Tester**: runs build/lint checks, archives on pass, returns Developer to fix on fail

Each role runs in its own AI session (Cursor or Antigravity). They communicate only through `multi-agent/status.json`.

---

## Skip flags

| Skip Designer | Skip Tester | Skip Developer | Pipeline |
|---|---|---|---|
| False | False | False | Architect → Designer → Developer → Tester |
| True | False | False | Architect → Developer → Tester |
| False | True | False | Architect → Designer → Developer |
| True | True | False | Architect → Developer |
| False | False | True | Architect → Designer |
| True | True | True | Architect only (research/investigation) |

---

## Multiple tasks

Tasks are processed one by one, top to bottom. Add as many blocks as needed:

```
--- task 10
Action: Fix login redirect bug
Stack: Next.js
Instructions: Happens only after OAuth callback. Check pages/auth/callback.tsx
---

--- task 11
Action: Add dark mode toggle to settings
Stack: Next.js
Skip Designer: True
---
```

The task number (`task N`) is a stable ID — it is stored in history and used for archiving. Do not renumber existing tasks.

---

## Checking queue status

```bash
python3 multi-agent/core/queue_stats.py
```

Output:
```
📋 QUEUE STATS
========================================
  Total tasks   : 5
  Completed     : 3
  In progress   : 1
  Remaining     : 1
  Progress [████████████░░░░░░░░]

  Current task  : Fix login redirect bug

  Pipeline:
    ✅  Architect: completed
    ✅  Designer: completed
    ⚙️  Developer: in_progress
    ⏸  Tester: waiting
```

---

## Resetting the pipeline

If agents crash or the pipeline gets stuck, run from the **project root**:

```bash
bash scripts/reset.sh
```

Or with explicit path if you're in a subdirectory:

```bash
bash /path/to/project/reset.sh
```

**What it does:**
- Resets `multi-agent/status.json` — all roles back to `waiting`, fresh `run_id`
- Regenerates `multi-agent/queue_stats.json` from current queue file
- Does **not** touch `multi-agent.tasks.txt` — your task queue is preserved

**After reset:** restart all agent sessions using the boot strings from `launch.md`.

---

## Launching agents

See `launch.md` for the exact boot strings for each role in both Antigravity and Cursor environments.
