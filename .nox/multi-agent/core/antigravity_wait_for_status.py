import json
import time
import sys
import os
import signal
import subprocess
from pathlib import Path

# Exit on SIGHUP (PTY/terminal closed when Antigravity session dies)
signal.signal(signal.SIGHUP, lambda sig, frame: sys.exit(1))

STATUS_FILE = str(Path(__file__).parents[2] / "multi-agent/status.json")
RUNTIME_DIR = Path(__file__).parent.parent / ".runtime"

def log(role: str, msg: str):
    try:
        log_file = RUNTIME_DIR / f"antigravity_{role.lower()}.log"
        ts = time.strftime("%H:%M:%S")
        with log_file.open("a") as f:
            f.write(f"[{ts}] {msg}\n")
    except Exception:
        pass
    print(msg)

def write_heartbeat(role: str):
    try:
        RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
        hb = RUNTIME_DIR / f"heartbeat_{role.lower()}.json"
        hb.write_text(json.dumps({"tick": int(time.time()), "ts": time.time(), "role": role.lower()}))
    except Exception:
        pass

def has_language_server_parent() -> bool:
    """Walk up process tree — return True if language_server is still an ancestor."""
    pid = os.getpid()
    for _ in range(12):
        try:
            ppid = int(subprocess.check_output(
                ["ps", "-p", str(pid), "-o", "ppid="],
                stderr=subprocess.DEVNULL
            ).strip())
        except Exception:
            return False
        if ppid <= 1:
            return False
        try:
            cmd = subprocess.check_output(
                ["ps", "-p", str(ppid), "-o", "command="],
                stderr=subprocess.DEVNULL
            ).decode().strip()
            if "language_server" in cmd:
                return True
        except Exception:
            return False
        pid = ppid
    return False

def wait_for_status(role, target_status):
    print(f"--- ANTIGRAVITY AUTONOMOUS MODE: {role.upper()} ---")
    print(f"JSON Path: {STATUS_FILE}")
    print(f"Current Directory (CWD): {os.getcwd()}")
    print(f"Waiting for status '{target_status}'...")

    MAX_WAIT_SECONDS = 15 * 60  # 15 min then exit(2) — live agent restarts, dead agent won't
    start_time = time.time()
    last_reported_status = None
    check_counter = 0
    initial_ppid = os.getppid()

    log(role, f"START ppid={initial_ppid} pid={os.getpid()}")

    while True:
        if time.time() - start_time > MAX_WAIT_SECONDS:
            log(role, "TIMEOUT exit(2) — restart if alive")
            sys.exit(2)

        # Check 1: reparented to launchd
        if os.getppid() == 1:
            log(role, "EXIT: ppid=1 (orphaned)")
            sys.exit(1)

        # Check 2: direct parent died (ppid changed)
        if os.getppid() != initial_ppid:
            log(role, f"EXIT: ppid changed {initial_ppid}→{os.getppid()}")
            sys.exit(1)

        # Check 3: language_server no longer in parent chain (every ~10s)
        check_counter += 1
        if check_counter % 4 == 0:
            if not has_language_server_parent():
                log(role, "EXIT: language_server gone from parent chain")
                sys.exit(1)

        write_heartbeat(role)

        if not os.path.exists(STATUS_FILE):
            log(role, f"ERROR: {STATUS_FILE} not found")
            time.sleep(5)
            continue

        try:
            with open(STATUS_FILE, "r") as f:
                data = json.load(f)

            run_id = data.get('run_id', 'N/A')
            role_data = next((s for s in data['pipeline'] if s['role'] == role), None)
            if not role_data:
                log(role, f"ERROR: role {role} not in pipeline")
                sys.exit(1)

            current_status = role_data['status']

            if current_status != last_reported_status:
                log(role, f"status={current_status}")
                last_reported_status = current_status

            if current_status == target_status:
                log(role, f"SIGNAL RECEIVED: {target_status}")
                sys.exit(0)

            time.sleep(3)
        except Exception as e:
            print(f"Read error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 antigravity_wait_for_status.py [Role] [Status] [optional: status_file_path]")
        sys.exit(1)

    if len(sys.argv) > 3:
        STATUS_FILE = sys.argv[3]

    wait_for_status(sys.argv[1], sys.argv[2])
