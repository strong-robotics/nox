#!/usr/bin/env python3
import json
import os
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

CORE_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = CORE_DIR.parent.parent
DEFAULT_TASKS_FILE = PROJECT_ROOT / "multi-agent.tasks.txt"
DEFAULT_RUNTIME_DIR = PROJECT_ROOT / "multi-agent/.runtime"

ROLE = "Architect"
runtime_dir = Path(os.environ.get("CODEX_APP_RUNTIME_DIR", DEFAULT_RUNTIME_DIR))
tasks_file = DEFAULT_TASKS_FILE
state_file: Path
pid_file: Path
log_file: Path
stopping = False


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def atomic_write_json(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def log(message: str):
    runtime_dir.mkdir(parents=True, exist_ok=True)
    with log_file.open("a", encoding="utf-8") as f:
        f.write(f"[{now_iso()}] {message}\n")


def write_state(state: str, signal_received: bool, extra=None):
    data = {
        "role": ROLE,
        "mode": "codex_app_chat",
        "state": state,
        "signal_received": signal_received,
        "wait_pid": os.getpid(),
        "signal_type": "task_queue",
        "tasks_file": str(tasks_file),
        "project_root": str(PROJECT_ROOT),
        "last_updated": now_iso(),
    }
    if extra:
        data.update(extra)
    atomic_write_json(state_file, data)


def handle_stop(signum, frame):
    global stopping
    stopping = True
    write_state("stopped", False, {"stop_signal": signum})
    try:
        if pid_file.exists() and pid_file.read_text().strip() == str(os.getpid()):
            pid_file.unlink()
    except Exception:
        pass
    log(f"stopped signal={signum}")
    sys.exit(0)


def task_content():
    try:
        if not tasks_file.exists():
            return ""
        return tasks_file.read_text(encoding="utf-8", errors="replace").strip()
    except Exception as exc:
        write_state("polling", False, {"error": str(exc)})
        return ""


def main():
    global tasks_file, state_file, pid_file, log_file

    if len(sys.argv) > 1:
        tasks_file = Path(sys.argv[1]).expanduser()

    runtime_dir.mkdir(parents=True, exist_ok=True)
    state_file = runtime_dir / "codex_app_architect.state.json"
    pid_file = runtime_dir / "codex_app_architect.pid"
    log_file = runtime_dir / "codex_app_architect.log"

    signal.signal(signal.SIGTERM, handle_stop)
    signal.signal(signal.SIGINT, handle_stop)

    pid_file.write_text(str(os.getpid()), encoding="utf-8")
    log(f"start pid={os.getpid()} role={ROLE} tasks_file={tasks_file}")

    while not stopping:
        content = task_content()
        if content:
            write_state(
                "signal_received",
                True,
                {
                    "queued_bytes": len(content),
                    "task_preview": content[:120],
                    "signal_at": now_iso(),
                },
            )
            log("signal_received task_queue")
            try:
                if pid_file.exists() and pid_file.read_text().strip() == str(os.getpid()):
                    pid_file.unlink()
            except Exception:
                pass
            sys.exit(0)

        write_state("polling", False, {"queued_bytes": 0})
        time.sleep(5)


if __name__ == "__main__":
    main()
