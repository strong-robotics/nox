# N.O.X. — Night Operations eXecutor

A self-contained multi-agent AI system that reads tasks from a single text file and autonomously plans, designs, implements, and tests code — directly in your project.

Install it like a library. It lives in `.nox/`. It never touches your project structure.

---

## Install

```bash
git clone https://github.com/strong-robotics/nox.git .nox
```

That's it. One folder added to your project.

---

## Requirements

- Python 3.13+ with venv inside `.nox/`
- Node.js 18+
- [Ollama](https://ollama.com) running locally (`llama3.2` model)
- [Piper TTS](https://github.com/rhasspy/piper) — voice synthesis
- At least one AI IDE: **Antigravity**, **Cursor**, or **Codex**

---

## Quick Start

**1. Start NOX**

```bash
.nox/run_nox.sh
```

This launches:
- Backend (FastAPI) → `http://localhost:777`
- Dashboard → `http://localhost:778`

**2. Open the dashboard**

Go to `http://localhost:778` — you'll see the agent pipeline status in real time.

**3. Start your agents** (see [Agent Setup](#agent-setup) below)

**4. Add a task**

Create or edit `multi-agent.tasks.txt` in your project root:

```
--- task 1
Action: Add a login screen with email and password fields
Stack: Flutter
Language: English
---
```

The Architect picks it up automatically — no restart needed.

**5. Watch it work**

The dashboard shows each agent's status as it moves through the pipeline:
`Architect → Designer → Developer → Tester`

---

## Task Format

Tasks live in `multi-agent.tasks.txt` at your project root.

### Minimal

```
--- task 1
Action: Fix the null check in UserService
---
```

### Full example

```
--- task 1
Action: Add a "Buy now" button to the product card with purchase flow
Stack: Next.js
Language: English
Skip Designer: False
Skip Developer: False
Skip Tester: False
Instructions: Button should open a modal with a quantity selector.
              Use the existing CartService.
              A similar button is in components/ProductList — reuse that pattern.
---
```

### All fields

| Field | Required | Description |
|-------|----------|-------------|
| `Action:` | ✅ | What needs to be done |
| `Stack:` | — | Tech stack: `Flutter`, `Next.js`, `Node.js`, etc. |
| `Language:` | — | Language for all output: `English`, `Ukrainian`, etc. |
| `Linear:` | — | Linear issue ID — Architect fetches full details automatically |
| `Skip Designer:` | — | `True` to skip design step, go straight to Developer |
| `Skip Tester:` | — | `True` to skip QA, Developer is the last step |
| `Skip Developer:` | — | `True` for research/planning tasks only |
| `Max QA Retries:` | — | Max Developer→Tester retry cycles (default: 3) |
| `Instructions:` | — | Context, hints, file paths, patterns to reuse |

### Multiple tasks

```
--- task 1
Action: Add login screen
Stack: Flutter
---

--- task 2
Action: Add registration flow
Stack: Flutter
---
```

Tasks are processed one by one, top to bottom.

### Pipeline variations

| Skip Designer | Skip Tester | Skip Developer | Pipeline |
|---------------|-------------|----------------|---------|
| False | False | False | Architect → Designer → Developer → Tester |
| True | False | False | Architect → Developer → Tester |
| False | True | False | Architect → Designer → Developer |
| True | True | True | Architect only (research) |

---

## Agent Setup

Each agent role runs in a separate AI IDE session. Start all four roles before adding tasks.

### Antigravity

> Detailed boot strings: `.nox/multi-agent/core/antigravity_*.md`

**Step 1.** Open Antigravity and create 4 chat sessions:
`Antigravity Architect`, `Designer`, `Developer`, `Tester`

**Step 2.** In each session, open the corresponding `.md` file from `.nox/multi-agent/core/` and paste its full contents as the first message.

For example, for Architect — paste the contents of:
```
.nox/multi-agent/core/antigravity_architect.md
```

**Step 3.** The agent will run the startup PID script and begin polling automatically.

---

### Cursor

> Detailed boot strings: `.nox/multi-agent/core/cursor_*.md`

**Step 1.** Open Cursor and create 4 chat sessions with the same names as above.

**Step 2.** Paste the contents of the corresponding `.nox/multi-agent/core/cursor_*.md` into each session.

**Step 3.** The agent starts polling for tasks immediately.

---

### Codex

> Detailed boot strings: `.nox/multi-agent/core/codex_*.md`

**Step 1.** Open Codex and create sessions for each role.

**Step 2.** Paste contents of `.nox/multi-agent/core/codex_*.md` into the corresponding session.

---

## Stopping Agents

Run the interactive kill menu:

```bash
.nox/scripts/kill_agent.sh
```

It shows all active agent processes and lets you select which one to stop. Cleans up PID and heartbeat files automatically.

---

## Reset Pipeline

If agents crash or the pipeline gets stuck:

```bash
.nox/scripts/reset.sh
```

Resets `status.json` to clean `waiting` state. Does not clear `multi-agent.tasks.txt`.

---

## Project Structure

```
your-project/
├── .nox/                        ← NOX lives here (don't edit manually)
│   ├── run_nox.sh               ← start everything
│   ├── scripts/
│   │   ├── main.py              ← backend + voice engine
│   │   ├── kill_agent.sh        ← stop agents
│   │   └── reset.sh             ← reset pipeline state
│   ├── multi-agent/
│   │   ├── status.json          ← pipeline state (read by dashboard)
│   │   ├── .runtime/            ← PID and heartbeat files
│   │   └── core/                ← agent boot strings and wait scripts
│   ├── dashboard/               ← Next.js UI (port 778)
│   ├── database/                ← NOX memory and chat history
│   └── docs/
│       └── manuals.md           ← full field reference and examples
│
└── multi-agent.tasks.txt        ← your only interface with NOX
```

---

## Voice Interface

NOX has a built-in voice assistant (Odin). Say **"Hey Odin"** to wake it up.

It responds with synthesized speech and can report agent status, current task, and queue state.

---

## More Details

Full documentation and field reference:
```
.nox/docs/manuals.md
```

Per-environment agent instructions:
```
.nox/multi-agent/core/antigravity_*.md
.nox/multi-agent/core/cursor_*.md
.nox/multi-agent/core/codex_*.md
```
