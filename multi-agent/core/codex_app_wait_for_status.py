#!/usr/bin/env python3
import json
import os
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

VALID_ROLES = {
    "architect": "Architect",
    "designer": "Designer",
    "developer": "Developer",
    "tester": "Tester",
}

CORE_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = CORE_DIR.parent.parent
DEFAULT_STATUS_FILE = PROJECT_ROOT / "multi-agent/status.json"
DEFAULT_RUNTIME_DIR = PROJECT_ROOT / "multi-agent/.runtime"
STALE_EXECUTING_SECONDS = 30 * 60

role = ""
target_status = ""
status_file = DEFAULT_STATUS_FILE
runtime_dir = Path(os.environ.get("CODEX_APP_RUNTIME_DIR", DEFAULT_RUNTIME_DIR))
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


def read_json(path: Path, fallback):
    try:
        if not path.exists():
            return fallback
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def log(message: str):
    runtime_dir.mkdir(parents=True, exist_ok=True)
    with log_file.open("a", encoding="utf-8") as f:
        f.write(f"[{now_iso()}] {message}\n")


def base_state(state: str, signal_received: bool, extra=None):
    data = {
        "role": role,
        "mode": "codex_app_chat",
        "state": state,
        "signal_received": signal_received,
        "wait_pid": os.getpid(),
        "target_status": target_status,
        "status_file": str(status_file),
        "project_root": str(PROJECT_ROOT),
        "last_updated": now_iso(),
    }
    if extra:
        data.update(extra)
    return data


def write_state(state: str, signal_received: bool, extra=None):
    atomic_write_json(state_file, base_state(state, signal_received, extra))


def is_fresh_executing(existing: dict):
    if existing.get("state") != "executing":
        return False
    claimed_at = existing.get("claimed_at")
    if not claimed_at:
        return False
    try:
        parsed = datetime.fromisoformat(str(claimed_at).replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - parsed).total_seconds() < STALE_EXECUTING_SECONDS
    except Exception:
        return False


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


def get_role_status(data: dict):
    for stage in data.get("pipeline", []):
        if stage.get("role") == role:
            return stage.get("status")
    return None


def main():
    global role, target_status, status_file, state_file, pid_file, log_file

    if len(sys.argv) < 3:
        print("Usage: python3 codex_app_wait_for_status.py <Role> <Status> [status_file_path]")
        sys.exit(1)

    role_key = sys.argv[1].strip().lower()
    if role_key not in VALID_ROLES:
        print(f"ERROR: unknown role '{sys.argv[1]}'. Use Architect, Designer, Developer, or Tester.")
        sys.exit(1)

    role = VALID_ROLES[role_key]
    target_status = sys.argv[2].strip()
    if len(sys.argv) > 3:
        status_file = Path(sys.argv[3]).expanduser()

    role_lower = role.lower()
    runtime_dir.mkdir(parents=True, exist_ok=True)
    state_file = runtime_dir / f"codex_app_{role_lower}.state.json"
    pid_file = runtime_dir / f"codex_app_{role_lower}.pid"
    log_file = runtime_dir / f"codex_app_{role_lower}.log"

    signal.signal(signal.SIGTERM, handle_stop)
    signal.signal(signal.SIGINT, handle_stop)

    pid_file.write_text(str(os.getpid()), encoding="utf-8")
    log(f"start pid={os.getpid()} role={role} target={target_status} status_file={status_file}")
    last_status = None

    while not stopping:
        existing = read_json(state_file, {})
        if is_fresh_executing(existing):
            time.sleep(5)
            continue

        data = read_json(status_file, None)
        if not isinstance(data, dict):
            write_state("polling", False, {"error": f"cannot read {status_file}"})
            time.sleep(5)
            continue

        current_status = get_role_status(data)
        run_id = data.get("run_id", "N/A")
        if current_status != last_status:
            log(f"run={run_id} status={current_status}")
            last_status = current_status

        if current_status == target_status:
            write_state(
                "signal_received",
                True,
                {
                    "run_id": run_id,
                    "matched_status": current_status,
                    "signal_at": now_iso(),
                },
            )
            log(f"signal_received role={role} status={target_status}")
            try:
                if pid_file.exists() and pid_file.read_text().strip() == str(os.getpid()):
                    pid_file.unlink()
            except Exception:
                pass
            sys.exit(0)

        write_state(
            "polling",
            False,
            {
                "run_id": run_id,
                "current_status": current_status,
            },
        )
        time.sleep(5)


if __name__ == "__main__":
    main()
