# 🚀 Multi-Agent Launch

This file contains the supported launch modes for the multi-agent pipeline.

---

## 📝 Manual Boot Strings

Use these only in hosts that truly keep a long-lived polling turn alive in chat or shell.

### 🏗️ ARCHITECT

**Antigravity (Gemini)**:
"COMMAND: INITIALIZE ROLE [ARCHITECT].
1. LOAD instructions from `./multi-agent/core/shared_architect.md`, `./multi-agent/core/antigravity_architect.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/antigravity_wait_for_task.py`
4. DO NOT TALK. GO."

**Codex**:
"COMMAND: INITIALIZE ROLE [ARCHITECT - CODEX].
1. LOAD instructions from `./multi-agent/core/shared_architect.md`, `./multi-agent/core/codex_architect.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/codex_wait_for_task.py`
4. DO NOT TALK. GO."

**Cursor (Claude Code)**:
"COMMAND: INITIALIZE ROLE [ARCHITECT].
1. LOAD instructions from `./multi-agent/core/shared_architect.md`, `./multi-agent/core/cursor_architect.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: start Monitor as described in `cursor_architect.md` STEP 1.
4. DO NOT TALK. GO."

### 🎨 DESIGNER

**Antigravity (Gemini)**:
"COMMAND: INITIALIZE ROLE [DESIGNER].
1. LOAD instructions from `./multi-agent/core/shared_designer.md`, `./multi-agent/core/antigravity_designer.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/antigravity_wait_for_status.py Designer ready`
4. DO NOT TALK. GO."

**Codex**:
"COMMAND: INITIALIZE ROLE [DESIGNER - CODEX].
1. LOAD instructions from `./multi-agent/core/shared_designer.md`, `./multi-agent/core/codex_designer.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/codex_wait_for_status.py Designer ready`
4. DO NOT TALK. GO."

**Cursor (Claude Code)**:
"COMMAND: INITIALIZE ROLE [DESIGNER].
1. LOAD instructions from `./multi-agent/core/shared_designer.md`, `./multi-agent/core/cursor_designer.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: start Monitor as described in `cursor_designer.md` STEP 1.
4. DO NOT TALK. GO."

### 💻 DEVELOPER

**Antigravity (Gemini)**:
"COMMAND: INITIALIZE ROLE [DEVELOPER].
1. LOAD instructions from `./multi-agent/core/shared_developer.md`, `./multi-agent/core/antigravity_developer.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/antigravity_wait_for_status.py Developer ready`
4. DO NOT TALK. GO."

**Codex**:
"COMMAND: INITIALIZE ROLE [DEVELOPER - CODEX].
1. LOAD instructions from `./multi-agent/core/shared_developer.md`, `./multi-agent/core/codex_developer.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/codex_wait_for_status.py Developer ready`
4. DO NOT TALK. GO."

**Cursor (Claude Code)**:
"COMMAND: INITIALIZE ROLE [DEVELOPER].
1. LOAD instructions from `./multi-agent/core/shared_developer.md`, `./multi-agent/core/cursor_developer.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: start Monitor as described in `cursor_developer.md` STEP 1.
4. DO NOT TALK. GO."

---

### 🔍 QA TESTER

Tester activates only when Developer is in the pipeline and Tester is not skipped. It waits for `Tester: ready` (set by Developer on completion), runs QA checks, and archives the task on success.

**Antigravity (Gemini)**:
"COMMAND: INITIALIZE ROLE [TESTER].
1. LOAD instructions from `./multi-agent/core/shared_tester.md`, `./multi-agent/core/antigravity_tester.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/antigravity_wait_for_status.py Tester ready`
4. DO NOT TALK. GO."

**Codex**:
"COMMAND: INITIALIZE ROLE [TESTER - CODEX].
1. LOAD instructions from `./multi-agent/core/shared_tester.md`, `./multi-agent/core/codex_tester.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/codex_wait_for_status.py Tester ready`
4. DO NOT TALK. GO."

**Cursor (Claude Code)**:
"COMMAND: INITIALIZE ROLE [TESTER].
1. LOAD instructions from `./multi-agent/core/shared_tester.md`, `./multi-agent/core/cursor_tester.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: start Monitor as described in `cursor_tester.md` STEP 1.
4. DO NOT TALK. GO."


---

### 🗣️ Communication Agent

Communication keeps its own launch flow and is not covered by the main multi-agent loop runner above.

**Antigravity**:
"COMMAND: INITIALIZE ROLE [COMMUNICATION].
1. LOAD instructions from `./communication/antigravity.md` and `./communication/shared_logic.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 communication/wait_for_status.py "Antigravity" "ready" --require-nonempty --enforce-speak-turn`.
4. DO NOT TALK. GO."

**Cursor**:
"COMMAND: INITIALIZE ROLE [COMMUNICATION].
1. LOAD instructions from `./communication/cursor.md` and `./communication/shared_logic.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 communication/wait_for_status.py "Cursor" "ready" --require-nonempty --enforce-speak-turn`.
4. DO NOT TALK. GO."

---

## 🤖 Codex Supervisor (required for Codex roles)

Codex must not own the eternal polling loop inside `codex exec`. The supervisor owns the wait loop:

1. Run the role-specific `codex_wait_for_*` script.
2. When the wait script returns successfully, launch one Codex turn in external-supervisor handoff mode.
3. Codex verifies fresh state, executes the role, updates files/status, then exits silently.
4. The supervisor re-arms the wait script.

Run from the project root:

```bash
bash start_codex.sh developer
bash status_codex.sh developer
bash stop_codex.sh developer
```

Advanced: run one terminal per Codex role:

```bash
bash multi-agent/core/codex_supervisor.sh architect
bash multi-agent/core/codex_supervisor.sh designer
bash multi-agent/core/codex_supervisor.sh developer
bash multi-agent/core/codex_supervisor.sh tester
```

The supervisor uses the Codex.app CLI by default: `/Applications/Codex.app/Contents/Resources/codex`.
Override with `CODEX_BIN=/path/to/codex` or `CODEX_MODEL=<model>` if needed.
Do not replace it with the manual Codex boot string for unattended operation; the manual string starts with a wait script and is only for hosts that can safely keep that wait alive themselves.

---

## 🔐 Cursor (Claude Code) — Auto-approve Tools

Cursor agents require tool auto-approval to run without permission prompts.
The project `.claude/settings.json` already pre-approves all required tools scoped to the project (no external paths).
If you launch Cursor agents from the terminal, add the flag:

```bash
claude --dangerouslySkipPermissions
```

---

## 🚦 Global Constraints
- First tool call must be the polling script.
- `communication` agent has its own setup and orchestration rules.
