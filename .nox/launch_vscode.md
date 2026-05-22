# 🖥️ VSCode (Claude Haiku 4.5 in VS Code Chat) — Launch Guide

This launch guide defines the `vscode` agent role, modeled after Antigravity but running from VS Code Chat interface.

**Platform**: Claude Haiku 4.5 / GitHub Copilot Chat
**Environment**: VS Code integrated chat (same process, terminal-based polling)
**Model**: Claude Haiku 4.5

## Boot Strings

### 🏗️ ARCHITECT

```
COMMAND: INITIALIZE ROLE [ARCHITECT].
1. LOAD instructions from `./.nox/multi-agent/core/shared_architect.md`, `./.nox/multi-agent/core/vscode_architect.md`, and `./.nox/multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 .nox/multi-agent/core/vscode_wait_for_task.py`
4. DO NOT TALK. GO.
```

### 🎨 DESIGNER

```
COMMAND: INITIALIZE ROLE [DESIGNER].
1. LOAD instructions from `./.nox/multi-agent/core/shared_designer.md`, `./.nox/multi-agent/core/vscode_designer.md`, and `./.nox/multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 .nox/multi-agent/core/vscode_wait_for_status.py Designer ready`
4. DO NOT TALK. GO.
```

### 💻 DEVELOPER

```
COMMAND: INITIALIZE ROLE [DEVELOPER].
1. LOAD instructions from `./.nox/multi-agent/core/shared_developer.md`, `./.nox/multi-agent/core/vscode_developer.md`, and `./.nox/multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 .nox/multi-agent/core/vscode_wait_for_status.py Developer ready`
4. DO NOT TALK. GO.
```

### 🔍 TESTER

```
COMMAND: INITIALIZE ROLE [TESTER].
1. LOAD instructions from `./.nox/multi-agent/core/shared_tester.md`, `./.nox/multi-agent/core/vscode_tester.md`, and `./.nox/multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 .nox/multi-agent/core/vscode_wait_for_status.py Tester ready`
4. DO NOT TALK. GO.
```
