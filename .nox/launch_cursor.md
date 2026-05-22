# 🖱️ Cursor (Claude Code) — Launch Guide

## 🔐 Auto-approve Tools

Cursor agents require tool auto-approval to run without permission prompts.
The project `.claude/settings.json` already pre-approves all required tools scoped to the project (no external paths).
If you launch Cursor agents from the terminal, add the flag:

```bash
claude --dangerouslySkipPermissions
```

---

## Boot Strings

### 🏗️ ARCHITECT

```
COMMAND: INITIALIZE ROLE [ARCHITECT].
1. LOAD instructions from `./.nox/multi-agent/core/shared_architect.md`, `./.nox/multi-agent/core/cursor_architect.md`, and `./.nox/multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: start Monitor as described in `cursor_architect.md` STEP 1.
4. DO NOT TALK. GO.
```

### 🎨 DESIGNER

```
COMMAND: INITIALIZE ROLE [DESIGNER].
1. LOAD instructions from `./.nox/multi-agent/core/shared_designer.md`, `./.nox/multi-agent/core/cursor_designer.md`, and `./.nox/multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: start Monitor as described in `cursor_designer.md` STEP 1.
4. DO NOT TALK. GO.
```

### 💻 DEVELOPER

```
COMMAND: INITIALIZE ROLE [DEVELOPER].
1. LOAD instructions from `./.nox/multi-agent/core/shared_developer.md`, `./.nox/multi-agent/core/cursor_developer.md`, and `./.nox/multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: start Monitor as described in `cursor_developer.md` STEP 1.
4. DO NOT TALK. GO.
```

### 🔍 TESTER

```
COMMAND: INITIALIZE ROLE [TESTER].
1. LOAD instructions from `./.nox/multi-agent/core/shared_tester.md`, `./.nox/multi-agent/core/cursor_tester.md`, and `./.nox/multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: start Monitor as described in `cursor_tester.md` STEP 1.
4. DO NOT TALK. GO.
```

### 🗣️ COMMUNICATION

```
COMMAND: INITIALIZE ROLE [COMMUNICATION].
1. LOAD instructions from `./.nox/communication/cursor.md` and `./.nox/communication/shared_logic.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 .nox/communication/wait_for_status.py "Cursor" "ready" --require-nonempty --enforce-speak-turn`.
4. DO NOT TALK. GO.
```
