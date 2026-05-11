# Codex Launch Guide

This file is only for Codex roles.

There are two Codex modes:

1. `CODEX_APP` - this Codex.app chat thread. Cheaper, but only runs when this chat wakes.
2. `CODEX_CLI` - terminal supervisor using `codex exec`. More autonomous, but uses more Codex limits.

Do not mix both modes in one Codex thread.

For “put Codex into the queue and leave it running”, use `CODEX_CLI`.
For “use this Codex.app chat as a role”, use `CODEX_APP`.

---

## CODEX_APP Mode

Important:
- Codex.app heartbeat agents do not have a stable PID.
- They are shown as virtual agents in `agents.sh`.
- The selected role is stored in `multi-agent/.runtime/codex_app_current_role.json`.
- The one boot prompt for each role sets the selected role and creates/updates the heartbeat for this same thread.
- The old Python waiter is optional. Do not rely on it when started from inside Codex.

Check current state:

```bash
bash agents.sh
cat multi-agent/.runtime/codex_app_current_role.json
```

Stop Codex.app autonomy:

```text
Ask Codex: stop/delete the Codex App heartbeat automation.
```

---

## CODEX_APP Architect

### Start

Paste this into the Codex.app chat:

```text
COMMAND: INITIALIZE ROLE [ARCHITECT - CODEX_APP].
1. EXECUTE IMMEDIATE: `bash set_codex_app_role.sh architect`.
2. LOAD instructions from `./multi-agent/core/shared_architect.md`, `./multi-agent/core/codex_app_chat.md`, and `./multi-agent/core/shared_global_rules.md`.
3. ENSURE HEARTBEAT: create or update a Codex.app heartbeat for this current thread every 2 minutes. The heartbeat must read `./multi-agent/.runtime/codex_app_current_role.json` on every wake and follow the selected role.
4. ROLE = Architect.
5. NOW AND ON EVERY HEARTBEAT: read `./multi-agent/.runtime/codex_app_current_role.json` and confirm selected role is Architect.
6. Read `./multi-agent.tasks.txt` directly.
7. If `./multi-agent.tasks.txt` is empty, write/update `./multi-agent/.runtime/codex_app_architect.state.json` as polling and output only `[POLLING]`.
8. If `./multi-agent.tasks.txt` is non-empty, claim and execute Architect according to the loaded instructions.
9. After handoff/cleanup, leave Codex.app Architect state as polling; the next heartbeat checks the queue again.
```

### Verify

```bash
bash agents.sh
```

Expected:

```text
CODEX.APP CHAT STATES
..* Architect polling ... mode=heartbeat virtual
```

---

## CODEX_APP Designer

### Start

Paste this into the Codex.app chat:

```text
COMMAND: INITIALIZE ROLE [DESIGNER - CODEX_APP].
1. EXECUTE IMMEDIATE: `bash set_codex_app_role.sh designer`.
2. LOAD instructions from `./multi-agent/core/shared_designer.md`, `./multi-agent/core/codex_app_chat.md`, and `./multi-agent/core/shared_global_rules.md`.
3. ENSURE HEARTBEAT: create or update a Codex.app heartbeat for this current thread every 2 minutes. The heartbeat must read `./multi-agent/.runtime/codex_app_current_role.json` on every wake and follow the selected role.
4. ROLE = Designer.
5. NOW AND ON EVERY HEARTBEAT: read `./multi-agent/.runtime/codex_app_current_role.json` and confirm selected role is Designer.
6. Read `./multi-agent/status.json` directly.
7. If `Designer` is not `ready` in `./multi-agent/status.json`, write/update `./multi-agent/.runtime/codex_app_designer.state.json` as polling and output only `[POLLING]`.
8. If `Designer=ready`, claim and execute Designer according to the loaded instructions.
9. After handoff/cleanup, leave Codex.app Designer state as polling; the next heartbeat checks status again.
```

### Verify

```bash
bash agents.sh
```

Expected:

```text
CODEX.APP CHAT STATES
..* Designer polling ... mode=heartbeat virtual
```

---

## CODEX_APP Developer

### Start

Paste this into the Codex.app chat:

```text
COMMAND: INITIALIZE ROLE [DEVELOPER - CODEX_APP].
1. EXECUTE IMMEDIATE: `bash set_codex_app_role.sh developer`.
2. LOAD instructions from `./multi-agent/core/shared_developer.md`, `./multi-agent/core/codex_app_chat.md`, and `./multi-agent/core/shared_global_rules.md`.
3. ENSURE HEARTBEAT: create or update a Codex.app heartbeat for this current thread every 2 minutes. The heartbeat must read `./multi-agent/.runtime/codex_app_current_role.json` on every wake and follow the selected role.
4. ROLE = Developer.
5. NOW AND ON EVERY HEARTBEAT: read `./multi-agent/.runtime/codex_app_current_role.json` and confirm selected role is Developer.
6. Read `./multi-agent/status.json` directly.
7. If `Developer` is not `ready` in `./multi-agent/status.json`, write/update `./multi-agent/.runtime/codex_app_developer.state.json` as polling and output only `[POLLING]`.
8. If `Developer=ready`, claim and execute Developer according to the loaded instructions.
9. After handoff/cleanup, leave Codex.app Developer state as polling; the next heartbeat checks status again.
```

### Verify

```bash
bash agents.sh
```

Expected:

```text
CODEX.APP CHAT STATES
..* Developer polling ... mode=heartbeat virtual
```

---

## CODEX_APP Tester

### Start

Paste this into the Codex.app chat:

```text
COMMAND: INITIALIZE ROLE [TESTER - CODEX_APP].
1. EXECUTE IMMEDIATE: `bash set_codex_app_role.sh tester`.
2. LOAD instructions from `./multi-agent/core/shared_tester.md`, `./multi-agent/core/codex_app_chat.md`, and `./multi-agent/core/shared_global_rules.md`.
3. ENSURE HEARTBEAT: create or update a Codex.app heartbeat for this current thread every 2 minutes. The heartbeat must read `./multi-agent/.runtime/codex_app_current_role.json` on every wake and follow the selected role.
4. ROLE = Tester.
5. NOW AND ON EVERY HEARTBEAT: read `./multi-agent/.runtime/codex_app_current_role.json` and confirm selected role is Tester.
6. Read `./multi-agent/status.json` directly.
7. If `Tester` is not `ready` in `./multi-agent/status.json`, write/update `./multi-agent/.runtime/codex_app_tester.state.json` as polling and output only `[POLLING]`.
8. If `Tester=ready`, claim and execute Tester according to the loaded instructions.
9. After pass/fail handoff/cleanup, leave Codex.app Tester state as polling; the next heartbeat checks status again.
```

### Verify

```bash
bash agents.sh
```

Expected:

```text
CODEX.APP CHAT STATES
..* Tester polling ... mode=heartbeat virtual
```

---

## CODEX_CLI Mode

Use this if you want Codex to sit in the queue from the terminal without this chat.

This mode uses:

```text
codex_supervisor.sh + codex exec
```

It is more autonomous, but it costs more Codex usage.

---

## CODEX_CLI Architect

### Start

Run from project root:

```bash
bash start_codex.sh architect
```

### Check

```bash
bash status_codex.sh architect
bash agents.sh
```

### Stop

```bash
bash stop_codex.sh architect
```

### Manual Boot String

Use only if manually starting a Codex CLI turn:

```text
COMMAND: INITIALIZE ROLE [ARCHITECT - CODEX].
1. LOAD instructions from `./multi-agent/core/shared_architect.md`, `./multi-agent/core/codex_architect.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/codex_wait_for_task.py`
4. DO NOT TALK. GO.
```

---

## CODEX_CLI Designer

### Start

Run from project root:

```bash
bash start_codex.sh designer
```

### Check

```bash
bash status_codex.sh designer
bash agents.sh
```

### Stop

```bash
bash stop_codex.sh designer
```

### Manual Boot String

Use only if manually starting a Codex CLI turn:

```text
COMMAND: INITIALIZE ROLE [DESIGNER - CODEX].
1. LOAD instructions from `./multi-agent/core/shared_designer.md`, `./multi-agent/core/codex_designer.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/codex_wait_for_status.py Designer ready`
4. DO NOT TALK. GO.
```

---

## CODEX_CLI Developer

### Start

Run from project root:

```bash
bash start_codex.sh developer
```

### Check

```bash
bash status_codex.sh developer
bash agents.sh
```

### Stop

```bash
bash stop_codex.sh developer
```

### Manual Boot String

Use only if manually starting a Codex CLI turn:

```text
COMMAND: INITIALIZE ROLE [DEVELOPER - CODEX].
1. LOAD instructions from `./multi-agent/core/shared_developer.md`, `./multi-agent/core/codex_developer.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/codex_wait_for_status.py Developer ready`
4. DO NOT TALK. GO.
```

---

## CODEX_CLI Tester

### Start

Run from project root:

```bash
bash start_codex.sh tester
```

### Check

```bash
bash status_codex.sh tester
bash agents.sh
```

### Stop

```bash
bash stop_codex.sh tester
```

### Manual Boot String

Use only if manually starting a Codex CLI turn:

```text
COMMAND: INITIALIZE ROLE [TESTER - CODEX].
1. LOAD instructions from `./multi-agent/core/shared_tester.md`, `./multi-agent/core/codex_tester.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/codex_wait_for_status.py Tester ready`
4. DO NOT TALK. GO.
```

---

## Quick Choice

Use Codex.app chat as Developer:

```bash
bash set_codex_app_role.sh developer
```

Then paste the `CODEX_APP Developer` boot string above and enable heartbeat in this chat.

Use autonomous CLI Codex as Developer:

```bash
bash start_codex.sh developer
```

Check everything:

```bash
bash agents.sh
```
