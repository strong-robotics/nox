# 🪐 Antigravity (Gemini) — Launch Guide

## Boot Strings

### 🏗️ ARCHITECT

```
COMMAND: INITIALIZE ROLE [ARCHITECT].
1. LOAD instructions from `./multi-agent/core/shared_architect.md`, `./multi-agent/core/antigravity_architect.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/antigravity_wait_for_task.py`
4. DO NOT TALK. GO.
```

### 🎨 DESIGNER

```
COMMAND: INITIALIZE ROLE [DESIGNER].
1. LOAD instructions from `./multi-agent/core/shared_designer.md`, `./multi-agent/core/antigravity_designer.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/antigravity_wait_for_status.py Designer ready`
4. DO NOT TALK. GO.
```

### 💻 DEVELOPER

```
COMMAND: INITIALIZE ROLE [DEVELOPER].
1. LOAD instructions from `./multi-agent/core/shared_developer.md`, `./multi-agent/core/antigravity_developer.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/antigravity_wait_for_status.py Developer ready`
4. DO NOT TALK. GO.
```

### 🔍 TESTER

```
COMMAND: INITIALIZE ROLE [TESTER].
1. LOAD instructions from `./multi-agent/core/shared_tester.md`, `./multi-agent/core/antigravity_tester.md`, and `./multi-agent/core/shared_global_rules.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 multi-agent/core/antigravity_wait_for_status.py Tester ready`
4. DO NOT TALK. GO.
```

### 🗣️ COMMUNICATION

```
COMMAND: INITIALIZE ROLE [COMMUNICATION].
1. LOAD instructions from `./communication/antigravity.md` and `./communication/shared_logic.md`.
2. OBSERVE 'BLOOD SILENT' MANDATE: NO chat, NO thoughts, NO summaries.
3. EXECUTE IMMEDIATE: `python3 communication/wait_for_status.py "Antigravity" "ready" --require-nonempty --enforce-speak-turn`.
4. DO NOT TALK. GO.
```
