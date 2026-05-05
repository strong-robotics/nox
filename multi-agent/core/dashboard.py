#!/usr/bin/env python3
import atexit
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path


STATUS_FILE = Path("multi-agent/status.json")
TASKS_FILE = Path("multi-agent.tasks.txt")
HISTORY_INDEX_FILE = Path("multi-agent/core/history/index.json")
RUNTIME_DIR = Path("multi-agent/.runtime")
CODEX_LOG_FILE = RUNTIME_DIR / "codex_developer_supervisor.log"
CODEX_PID_FILE = RUNTIME_DIR / "codex_developer_supervisor.pid"
CURSOR_LOG_FILE = RUNTIME_DIR / "cursor_architect.log"


def read_json(path, fallback):
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return fallback


def read_lines(path, max_lines=400):
    try:
        with path.open("r", encoding="utf-8", errors="replace") as f:
            return f.readlines()[-max_lines:]
    except Exception:
        return []


def truncate(text, width):
    text = " ".join(str(text).split())
    if len(text) <= width:
        return text
    return text[: max(width - 3, 0)] + "..."


def queued_task_count():
    try:
        text = TASKS_FILE.read_text(encoding="utf-8")
    except Exception:
        return 0
    return len(re.findall(r"(?m)^---\s+task\s+\d+", text))


def completed_task_count():
    data = read_json(HISTORY_INDEX_FILE, {})
    return int(data.get("total_tasks") or len(data.get("tasks", {})))


def pid_alive(pid):
    if not pid:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def ps_rows():
    try:
        result = subprocess.run(
            ["ps", "-eo", "pid=,ppid=,stat=,command="],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=2,
        )
    except Exception:
        return []

    rows = []
    for line in result.stdout.splitlines():
        parts = line.strip().split(None, 3)
        if len(parts) < 4:
            continue
        try:
            pid = int(parts[0])
            ppid = int(parts[1])
        except ValueError:
            continue
        rows.append({"pid": pid, "ppid": ppid, "stat": parts[2], "cmd": parts[3]})
    return rows


def process_matches(patterns):
    rows = ps_rows()
    return [r for r in rows if any(p in r["cmd"] for p in patterns)]


def role_icon(status):
    return {
        "waiting": "..",
        "ready": ">>",
        "in_progress": "##",
        "completed": "OK",
    }.get(status, "??")


def pid_from_file(path):
    try:
        return int(path.read_text(encoding="utf-8").strip())
    except Exception:
        return None


def codex_state():
    pid = pid_from_file(CODEX_PID_FILE)
    alive = pid_alive(pid)
    lines = process_matches(("codex_supervisor", "codex_wait_for_status", "codex_wait_for_task", "codex exec"))
    execs = [r for r in lines if "codex exec" in r["cmd"]]
    waits = [r for r in lines if "codex_wait_for_" in r["cmd"]]
    supervisors = [r for r in lines if "codex_supervisor.sh" in r["cmd"]]

    if not alive and not supervisors:
        state = "STOPPED"
        detail = "No live codex_supervisor process"
    elif execs:
        state = "EXECUTING"
        detail = "codex exec turn is running"
    elif waits:
        state = "WAITING"
        detail = wait_detail(waits[0]["cmd"])
    else:
        state = "RUNNING"
        detail = "Supervisor alive, no child state detected"

    model = "unknown"
    binary = "unknown"
    for line in reversed(read_lines(CODEX_LOG_FILE, 700)):
        clean = line.strip()
        if clean.startswith("[SUPERVISOR] Codex model:"):
            model = clean.split(":", 1)[1].strip()
            break
        if clean.startswith("model:"):
            model = clean.split(":", 1)[1].strip()
            break
    for line in reversed(read_lines(CODEX_LOG_FILE, 700)):
        clean = line.strip()
        if clean.startswith("[SUPERVISOR] Codex binary:"):
            binary = clean.split(":", 1)[1].strip()
            break

    return {
        "state": state,
        "detail": detail,
        "pid": pid if pid is not None else (supervisors[0]["pid"] if supervisors else None),
        "model": model,
        "binary": binary,
        "processes": lines,
        "duplicates": duplicate_warning("codex", supervisors, waits, execs),
    }


def wait_detail(cmd):
    match = re.search(r"(codex|antigravity|cursor)_wait_for_(status|task)\.py(?:\s+([^\"'].*))?$", cmd)
    if not match:
        return "Waiting"
    kind = match.group(2)
    args = (match.group(3) or "").strip()
    if kind == "task":
        return "Waiting for task queue"
    return "Waiting for " + (args or "status")


def duplicate_warning(name, supervisors, waits, execs):
    warnings = []
    if len(supervisors) > 1:
        warnings.append(f"{len(supervisors)} {name} supervisors")
    if len(waits) > 1:
        warnings.append(f"{len(waits)} wait scripts")
    if len(execs) > 1:
        warnings.append(f"{len(execs)} exec turns")
    return ", ".join(warnings)


def antigravity_state():
    patterns = (
        "antigravity_wait_for_status.py",
        "antigravity_wait_for_task.py",
        "/Applications/Antigravity.app/",
    )
    all_lines = process_matches(patterns)
    waits = [r for r in all_lines if "antigravity_wait_for_" in r["cmd"]]
    app_lines = [r for r in all_lines if "/Applications/Antigravity.app/" in r["cmd"]]

    if waits:
        state = "WAITING"
        detail = wait_detail(waits[0]["cmd"])
    elif app_lines:
        state = "APP_OPEN"
        detail = "Antigravity app is open, no role wait script detected"
    else:
        state = "STOPPED"
        detail = "No Antigravity app or wait script detected"

    return {
        "state": state,
        "detail": detail,
        "pid": waits[0]["pid"] if waits else (app_lines[0]["pid"] if app_lines else None),
        "waits": waits,
        "app_process_count": len(app_lines),
        "duplicates": duplicate_warning("antigravity", [], waits, []),
    }


def cursor_state():
    patterns = (
        "cursor_wait_for_status.py",
        "cursor_wait_for_task.py",
        "multi-agent.tasks.txt",
        "/.cursor/extensions/anthropic.claude-code",
    )
    all_lines = process_matches(patterns)
    waits = [r for r in all_lines if "cursor_wait_for_" in r["cmd"] or "multi-agent.tasks.txt" in r["cmd"]]
    claude = [r for r in all_lines if "/.cursor/extensions/anthropic.claude-code" in r["cmd"]]

    if waits:
        state = "WAITING"
        detail = wait_detail(waits[0]["cmd"])
        if "multi-agent.tasks.txt" in waits[0]["cmd"]:
            detail = "Waiting for task queue"
    elif claude:
        state = "CLAUDE_OPEN"
        detail = "Claude Code process exists, no role wait script detected"
    else:
        state = "STOPPED"
        detail = "No Cursor/Claude role process detected"

    return {
        "state": state,
        "detail": detail,
        "pid": waits[0]["pid"] if waits else (claude[0]["pid"] if claude else None),
        "waits": waits,
        "claude_count": len(claude),
        "duplicates": duplicate_warning("cursor", [], waits, []),
    }


def normalize_codex_event(line):
    clean = line.strip()
    if not clean:
        return None
    if clean.startswith("[START]") or clean.startswith("[MANUAL]"):
        return clean
    if "Starting Codex developer loop" in clean:
        return "Supervisor started"
    if "Codex binary:" in clean:
        return clean.replace("[SUPERVISOR] ", "")
    if "Codex model:" in clean:
        return clean.replace("[SUPERVISOR] ", "")
    if "waiting for Developer signal" in clean:
        return "Waiting for Developer ready"
    if "CODEX_SIGNAL_RECEIVED" in clean:
        return "Developer ready signal received"
    if "Signal received" in clean and "launching Codex" in clean:
        return "Launching codex exec turn"
    if clean.startswith("model:"):
        return "Exec model: " + clean.split(":", 1)[1].strip()
    if clean.startswith("*** Add File:"):
        return "Patch add: " + clean.split(":", 1)[1].strip()
    if clean.startswith("*** Update File:"):
        return "Patch update: " + clean.split(":", 1)[1].strip()
    if "command not found: flutter" in clean:
        return "Verification blocked: flutter not found"
    if "Success. Updated the following files:" in clean:
        return "Patch applied successfully"
    if clean == "NO_REPLY":
        return "Codex turn returned NO_REPLY"
    if "exited" in clean and "re-arming wait" in clean:
        return "Codex turn finished; supervisor re-armed"
    if "stopping supervisor" in clean:
        return clean.replace("[SUPERVISOR] ", "")
    if clean.startswith("ERROR:"):
        return clean
    return None


def recent_codex_events(limit=8):
    events = []
    seen = set()
    for line in reversed(read_lines(CODEX_LOG_FILE, 800)):
        event = normalize_codex_event(line)
        if not event:
            continue
        if event in seen and event in {
            "Waiting for Developer ready",
            "Patch applied successfully",
            "Codex turn returned NO_REPLY",
        }:
            continue
        seen.add(event)
        events.append(event)
        if len(events) >= limit:
            break
    return list(reversed(events))


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


def recent_cursor_events(limit=8):
    events = []
    seen = set()
    for line in reversed(read_lines(CURSOR_LOG_FILE, 500)):
        clean = line.strip()
        if not clean:
            continue
        parts = clean.split("] ", 1)
        if len(parts) == 2:
            key = parts[1].strip().split()[0] if parts[1].strip() else ""
            label = EVENT_LABELS.get(key, clean)
            ts = parts[0].lstrip("[")
            entry = f"{ts}  {label}"
        else:
            entry = clean
        if entry in seen:
            continue
        seen.add(entry)
        events.append(entry)
        if len(events) >= limit:
            break
    return list(reversed(events))


def print_process_list(title, processes, limit=5):
    if not processes:
        print(f" {title:<12}: none")
        return
    print(f" {title:<12}: {len(processes)}")
    for proc in processes[:limit]:
        print(f"   PID {str(proc['pid']).ljust(7)} PPID {str(proc['ppid']).ljust(7)} {truncate(proc['cmd'], 64)}")
    if len(processes) > limit:
        print(f"   ... {len(processes) - limit} more")


def print_runtime_block(title, runtime, kind):
    print("=" * 100)
    print(f" {title}")
    pid = runtime.get("pid") if runtime.get("pid") is not None else "-"
    print(f" State        : {runtime['state']} ({runtime['detail']})")
    print(f" PID          : {pid}")

    warning = runtime.get("duplicates")
    if warning:
        print(f" WARNING      : {warning}")

    if kind == "codex":
        print(f" Model        : {runtime.get('model', 'unknown')}")
        print(f" Binary       : {truncate(runtime.get('binary', 'unknown'), 72)}")
        print_process_list("Processes", runtime.get("processes", []))
        print("-" * 100)
        print(" RECENT CODEX EVENTS")
        events = recent_codex_events()
        if events:
            for event in events:
                print(f" - {truncate(event, 94)}")
        else:
            print(" - No Codex log events yet")
    elif kind == "antigravity":
        print_process_list("Wait scripts", runtime.get("waits", []))
        print(f" App processes: {runtime.get('app_process_count', 0)}")
    elif kind == "cursor":
        print_process_list("Wait scripts", runtime.get("waits", []))
        print(f" Claude procs : {runtime.get('claude_count', 0)}")
        print("-" * 100)
        print(" RECENT CURSOR EVENTS")
        events = recent_cursor_events()
        if events:
            for event in events:
                print(f" - {truncate(event, 94)}")
        else:
            print(" - No Cursor log events yet")


def enter_alternate_screen():
    sys.stdout.write("\033[?1049h\033[H")
    sys.stdout.flush()


def exit_alternate_screen():
    sys.stdout.write("\033[?1049l")
    sys.stdout.flush()


def display_dashboard():
    enter_alternate_screen()
    atexit.register(exit_alternate_screen)

    while True:
        if not STATUS_FILE.exists():
            print("Status file not found...")
            time.sleep(5)
            continue

        try:
            data = read_json(STATUS_FILE, {})
            completed = completed_task_count()
            queued = queued_task_count()
            codex = codex_state()
            antigravity = antigravity_state()
            cursor = cursor_state()

            sys.stdout.write("\033[H\033[2J")
            sys.stdout.flush()
            print("=" * 100)
            print(" MULTI-AGENT PIPELINE DASHBOARD (V7)")
            print(f" RUN ID       : {data.get('run_id', 'N/A')}")
            print(f" CURRENT TASK : {data.get('current_task', 'N/A')}")
            print(f" QUEUE        : completed={completed} queued={queued}")
            print("=" * 100)

            print(" PIPELINE")
            for stage in data.get("pipeline", []):
                role = stage.get("role", "?").ljust(12)
                status = stage.get("status", "?")
                desc = truncate(stage.get("description", ""), 40)
                started = stage.get("started_at") or "-"
                completed_at = stage.get("completed_at") or "-"
                print(
                    f" {role_icon(status)} {role} | {status.upper().ljust(12)} "
                    f"| start {started} | done {completed_at} | {desc}"
                )

            print_runtime_block("CODEX DEVELOPER RUNTIME", codex, "codex")
            print_runtime_block("ANTIGRAVITY RUNTIME", antigravity, "antigravity")
            print_runtime_block("CURSOR / CLAUDE RUNTIME", cursor, "cursor")

            print("=" * 100)
            print(f" Last Updated : {data.get('last_updated', 'N/A')}")
            print(" Controls     : Ctrl+C stops dashboard only.")
            print(" Codex        : bash start_codex.sh developer | bash stop_codex.sh developer")
            print("=" * 100)

            time.sleep(3)
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"Dashboard error: {e}")
            time.sleep(2)


if __name__ == "__main__":
    display_dashboard()
