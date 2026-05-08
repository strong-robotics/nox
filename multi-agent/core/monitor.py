#!/usr/bin/env python3
import json
import os
import re
import subprocess
import time
from pathlib import Path

# Setup paths relative to this script's location
# This script is in /multi-agent/core/monitor.py
# Project root is two levels up
CORE_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = CORE_DIR.parent.parent

STATUS_FILE = PROJECT_ROOT / "multi-agent/status.json"
TASKS_FILE = PROJECT_ROOT / "multi-agent.tasks.txt"
HISTORY_INDEX_FILE = PROJECT_ROOT / "multi-agent/core/history/index.json"
RUNTIME_DIR = PROJECT_ROOT / "multi-agent/.runtime"
CODEX_LOG_FILE = RUNTIME_DIR / "codex_developer_supervisor.log"
CODEX_PID_FILE = RUNTIME_DIR / "codex_developer_supervisor.pid"
CURSOR_LOG_FILE = RUNTIME_DIR / "cursor_architect.log"

EVENT_LABELS = {
    "TASK_FOUND": "Task found in queue",
    "GLOBAL_RESET": "Global reset done",
    "ARCHITECT_START": "Architect in_progress",
    "PLAN_WRITTEN": "Plan + task.md written",
    "HANDOFF_DEVELOPER": "Developer set ready",
    "HANDOFF_DESIGNER": "Designer set ready",
    "TESTER_DONE": "Tester completed signal",
    "DEVELOPER_DONE": "Developer completed signal",
    "DESIGNER_DONE": "Designer completed signal",
}

def read_json(path, fallback):
    try:
        if not path.exists(): return fallback
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return fallback

def read_lines(path, max_lines=400):
    try:
        if not path.exists(): return []
        with path.open("r", encoding="utf-8", errors="replace") as f:
            return f.readlines()[-max_lines:]
    except Exception:
        return []

def get_all_tasks():
    """Returns list of task dicts parsed from tasks.txt blocks."""
    try:
        if not TASKS_FILE.exists():
            print(f"DEBUG: TASKS_FILE NOT FOUND at {TASKS_FILE}")
            return []

        content = TASKS_FILE.read_text(encoding="utf-8", errors="replace")
        tasks = []

        blocks = re.findall(r"--- task \d+\n(.*?)\n---", content, re.DOTALL)
        for block in blocks:
            task = {}
            for line in block.splitlines():
                m = re.match(r"^\s*([A-Za-z][A-Za-z\s]*):\s*(.*)", line)
                if m:
                    key = m.group(1).strip().lower().replace(" ", "_")
                    task[key] = m.group(2).strip()
            if task:
                tasks.append(task)

        if tasks:
            return tasks

        # Fallback: action-only objects
        for line in content.splitlines():
            m = re.search(r"^\s*Action:\s*(.*)", line, re.IGNORECASE)
            if m:
                tasks.append({"action": m.group(1).strip()})
        return tasks
    except Exception as e:
        print(f"DEBUG: Task parsing error: {e}")
        return []

def queued_task_count():
    return len(get_all_tasks())

def completed_task_count():
    data = read_json(HISTORY_INDEX_FILE, {})
    # Use total_tasks if available, else count keys in tasks dict
    if "total_tasks" in data: return int(data["total_tasks"])
    return len(data.get("tasks", {}))

def pid_alive(pid):
    if not pid: return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False

def ps_rows():
    try:
        result = subprocess.run(
            ["ps", "-eo", "pid=,ppid=,stat=,command="],
            text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=2
        )
        rows = []
        for line in result.stdout.splitlines():
            parts = line.strip().split(None, 3)
            if len(parts) < 4: continue
            try:
                rows.append({"pid": int(parts[0]), "ppid": int(parts[1]), "stat": parts[2], "cmd": parts[3]})
            except ValueError: continue
        return rows
    except Exception:
        return []

def process_matches(patterns):
    rows = ps_rows()
    return [r for r in rows if any(p in str(r.get("cmd", "")) for p in patterns)]

def wait_detail(cmd):
    match = re.search(r"(codex|antigravity|cursor)_wait_for_(status|task)\.py(?:\s+([^\"'].*))?$", cmd)
    if not match: return "Waiting"
    kind, args = match.group(2), (match.group(3) or "").strip()
    return "Waiting for task queue" if kind == "task" else f"Waiting for {args or 'status'}"

CODEX_ROLES = ["architect", "developer", "designer", "tester"]
HEARTBEAT_TIMEOUT = 15  # seconds without tick update = agent considered dead

def heartbeat_alive(role: str):
    """Returns True/False if heartbeat file exists, None if no heartbeat (ignore)."""
    hb_file = RUNTIME_DIR / f"heartbeat_{role.lower()}.json"
    if not hb_file.exists():
        return None
    try:
        data = json.loads(hb_file.read_text())
        age = time.time() - data.get("ts", 0)
        return age < HEARTBEAT_TIMEOUT
    except Exception:
        return None

def normalize_codex_event(line):
    clean = line.strip()
    if not clean: return None
    if "Starting Codex" in clean and "loop" in clean: return "Supervisor started"
    if "Codex binary:" in clean: return clean.replace("[SUPERVISOR] ", "")
    if "Codex model:" in clean: return clean.replace("[SUPERVISOR] ", "")
    if "waiting for" in clean and "signal" in clean: return f"Waiting for signal"
    if "CODEX_SIGNAL_RECEIVED" in clean: return "Signal received"
    if "Success. Updated the following files:" in clean: return "Patch applied successfully"
    if clean == "NO_REPLY": return "Codex turn returned NO_REPLY"
    if clean.startswith("ERROR:"): return clean
    return None

def get_codex_role_state(role):
    """State for a single codex role based on pid file + log."""
    pid_path = RUNTIME_DIR / f"codex_{role}_supervisor.pid"
    log_path = RUNTIME_DIR / f"codex_{role}_supervisor.log"
    pid = None
    try:
        if pid_path.exists(): pid = int(pid_path.read_text().strip())
    except: pass

    alive = pid_alive(pid)
    supervisors = process_matches((f"codex_supervisor.sh {role}",))
    execs = process_matches(("codex exec",))
    waits = process_matches((f"codex_wait_for_",))
    role_waits = [r for r in waits if role in str(r.get("cmd", ""))]

    state = "STOPPED"
    detail = "No live process"
    if execs and alive: state, detail = "EXECUTING", "codex exec running"
    elif role_waits: state, detail = "WAITING", wait_detail(str(role_waits[0].get("cmd", "")))
    elif alive or supervisors: state, detail = "RUNNING", "Supervisor active"

    model, binary = "unknown", "unknown"
    log_lines = read_lines(log_path, 700)
    for line in reversed(log_lines):
        clean = line.strip()
        if "[SUPERVISOR] Codex model:" in clean: model = clean.split(":", 1)[1].strip(); break
    for line in reversed(log_lines):
        if "[SUPERVISOR] Codex binary:" in line: binary = line.split(":", 1)[1].strip(); break

    events, seen = [], set()
    for line in reversed(log_lines[:800]):
        event = normalize_codex_event(line)
        if event and event not in seen:
            seen.add(event); events.append(event)
            if len(events) >= 6: break

    return {"role": role, "state": state, "detail": detail, "pid": pid, "alive": alive, "model": model, "binary": binary, "events": list(reversed(events))}

def get_codex_state():
    """Legacy: returns developer state for backward compat."""
    return get_codex_role_state("developer")

def get_recent_codex_events(limit=8):
    events, seen = [], set()
    for line in reversed(read_lines(CODEX_LOG_FILE, 800)):
        event = normalize_codex_event(line)
        if event and event not in seen:
            seen.add(event); events.append(event)
            if len(events) >= limit: break
    return list(reversed(events))

def get_all_codex_states():
    """Returns state for all codex roles that have a log or pid file."""
    result = []
    for role in CODEX_ROLES:
        pid_path = RUNTIME_DIR / f"codex_{role}_supervisor.pid"
        log_path = RUNTIME_DIR / f"codex_{role}_supervisor.log"
        if pid_path.exists() or log_path.exists():
            result.append(get_codex_role_state(role))
    return result

def get_recent_cursor_events(limit=8):
    events, seen = [], set()
    for line in reversed(read_lines(CURSOR_LOG_FILE, 500)):
        clean = line.strip()
        if not clean: continue
        parts = clean.split("] ", 1)
        if len(parts) == 2:
            key = parts[1].strip().split()[0] if parts[1].strip() else ""
            label = EVENT_LABELS.get(key, clean)
            entry = f"{parts[0].lstrip('[')}  {label}"
        else: entry = clean
        if entry not in seen:
            seen.add(entry); events.append(entry)
            if len(events) >= limit: break
    return list(reversed(events))

def find_language_server_parent(child_pid):
    """Walk up process tree from child_pid, return first pid whose command contains language_server."""
    rows = {r["pid"]: r for r in ps_rows()}
    p = child_pid
    visited = set()
    while p and p != 1 and p not in visited:
        visited.add(p)
        row = rows.get(p)
        if not row:
            break
        if "language_server" in str(row.get("cmd", "")):
            return p
        p = row["ppid"]
    return None

def detect_antigravity_live(role):
    """Find a running antigravity_wait_for_*.py for role that is still a child of language_server.
    Orphaned scripts (reparented to launchd after session death) are ignored.
    Returns (language_server_pid, script_pid) or (None, None)."""
    role_lower = role.lower()
    rows = ps_rows()
    for r in rows:
        cmd = str(r.get("cmd", ""))
        if "antigravity_wait_for_status.py" in cmd and role_lower in cmd.lower():
            ls_pid = find_language_server_parent(r["pid"])
            if ls_pid:  # orphan if None — session died, script reparented to launchd
                return ls_pid, r["pid"]
        if "antigravity_wait_for_task.py" in cmd:
            ls_pid = find_language_server_parent(r["pid"])
            if ls_pid:
                return ls_pid, r["pid"]
    return None, None

def get_live_agents():
    """Return list of identified live agent processes from pid files, with fallback detection."""
    agents = []
    pid_file_patterns = [
        ("cursor_architect.pid",   "Architect",  "cursor"),
        ("cursor_developer.pid",   "Developer",  "cursor"),
        ("cursor_designer.pid",    "Designer",   "cursor"),
        ("cursor_tester.pid",      "Tester",     "cursor"),
        ("antigravity_architect.pid", "Architect", "antigravity"),
        ("antigravity_developer.pid", "Developer", "antigravity"),
        ("antigravity_designer.pid",  "Designer",  "antigravity"),
        ("antigravity_tester.pid",    "Tester",    "antigravity"),
        ("codex_architect_supervisor.pid",  "Architect",  "codex"),
        ("codex_developer_supervisor.pid",  "Developer",  "codex"),
        ("codex_designer_supervisor.pid",   "Designer",   "codex"),
        ("codex_tester_supervisor.pid",     "Tester",     "codex"),
    ]
    seen_roles_envs = set()
    for filename, role, env in pid_file_patterns:
        pid_path = RUNTIME_DIR / filename
        pid, alive = None, False
        if pid_path.exists():
            try:
                pid = int(pid_path.read_text().strip())
                alive = pid_alive(pid)
            except Exception:
                pass
        # Antigravity: alive = script running (not IDE), kill = script pid only
        kill_pid = pid if env != "antigravity" else None
        if env == "antigravity":
            alive = False  # reset — IDE staying open doesn't mean agent is active
            ls_pid, script_pid = detect_antigravity_live(role)
            if script_pid:
                alive = True
                kill_pid = script_pid
            if ls_pid:
                if not pid_alive(pid):
                    pid = ls_pid
                    try:
                        pid_path.write_text(str(pid))
                    except Exception:
                        pass
            elif pid is None and ls_pid:
                pid = ls_pid
        if pid is None:
            continue
        # Heartbeat override: if file exists and is stale → agent is dead
        hb = heartbeat_alive(role)
        if hb is not None:
            alive = hb
        key = (env, role)
        if key in seen_roles_envs:
            continue
        seen_roles_envs.add(key)
        agents.append({
            "role": role,
            "env": env,
            "pid": pid,
            "kill_pid": kill_pid,
            "alive": alive,
            "pid_file": filename,
        })
    return agents

def get_antigravity_state():
    patterns = ("antigravity_wait_for_status.py", "antigravity_wait_for_task.py", "/Applications/Antigravity.app/")
    all_lines = process_matches(patterns)
    waits = [r for r in all_lines if "antigravity_wait_for_" in str(r.get("cmd", ""))]
    app_lines = [r for r in all_lines if "/Applications/Antigravity.app/" in str(r.get("cmd", ""))]
    state = "STOPPED"
    detail = "No process detected"
    if waits: state, detail = "WAITING", wait_detail(str(waits[0].get("cmd", "")))
    elif app_lines: state, detail = "APP_OPEN", "App is open"
    return {"state": state, "detail": detail, "pid": waits[0].get("pid") if waits else (app_lines[0].get("pid") if app_lines else None), "count": len(app_lines)}

def get_cursor_state():
    patterns = ("cursor_wait_for_status.py", "cursor_wait_for_task.py", "multi-agent.tasks.txt", "/.cursor/extensions/anthropic.claude-code")
    all_lines = process_matches(patterns)
    waits = [r for r in all_lines if "cursor_wait_for_" in str(r.get("cmd", "")) or "multi-agent.tasks.txt" in str(r.get("cmd", ""))]
    claude = [r for r in all_lines if "/.cursor/extensions/anthropic.claude-code" in str(r.get("cmd", ""))]
    state = "STOPPED"
    detail = "No process detected"
    if waits: state, detail = "WAITING", wait_detail(str(waits[0].get("cmd", "")))
    elif claude: state, detail = "CLAUDE_OPEN", "Claude process active"
    return {"state": state, "detail": detail, "pid": waits[0].get("pid") if waits else (claude[0].get("pid") if claude else None), "count": len(claude)}

def get_full_system_state():
    """Main entry point for Nox and Dashboard to get all data."""
    status = read_json(STATUS_FILE, {})
    return {
        "run_id": status.get("run_id", "N/A"),
        "current_task": status.get("current_task", "N/A"),
        "tasks": {
            "completed": completed_task_count(),
            "queued": queued_task_count(),
            "all_queued": get_all_tasks()
        },
        "pipeline": status.get("pipeline", []),
        "live_agents": get_live_agents(),
        "codex_agents": get_all_codex_states(),
        "codex": get_codex_state(),
        "cursor_events": get_recent_cursor_events(),
        "last_updated": status.get("last_updated", "N/A")
    }
