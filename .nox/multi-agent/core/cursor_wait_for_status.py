import json
import time
import sys
import os
import atexit
from pathlib import Path

STATUS_FILE = str(Path(__file__).parents[2] / "multi-agent/status.json")
RUNTIME_DIR = Path(__file__).parent.parent / ".runtime"

def pid_file(role: str) -> Path:
    return RUNTIME_DIR / f"cursor_{role.lower()}.pid"

def write_pid(role: str):
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    pid_file(role).write_text(str(os.getpid()))

def remove_pid(role: str):
    try:
        p = pid_file(role)
        if p.exists() and p.read_text().strip() == str(os.getpid()):
            p.unlink()
    except Exception:
        pass

def wait_for_status(role, target_status):
    write_pid(role)
    atexit.register(remove_pid, role)
    print(f"--- CURSOR AUTONOMOUS MODE: {role.upper()} (pid={os.getpid()}) ---")
    print(f"JSON Path: {STATUS_FILE}")
    print(f"Current Directory (CWD): {os.getcwd()}")
    print(f"Waiting for status '{target_status}'...")

    last_reported_status = None

    while True:
        if not os.path.exists(STATUS_FILE):
            print(f"ERROR: File {STATUS_FILE} not found!")
            time.sleep(5)
            continue

        try:
            with open(STATUS_FILE, "r") as f:
                data = json.load(f)

            run_id = data.get('run_id', 'N/A')
            role_data = next((s for s in data['pipeline'] if s['role'] == role), None)
            if not role_data:
                print(f"Error: Role {role} not found in status.json")
                sys.exit(1)

            current_status = role_data['status']

            if current_status != last_reported_status:
                print(f"[{run_id}] Status changed: {current_status}")
                last_reported_status = current_status

            if current_status == target_status:
                print(f"\n✅ COMMAND RECEIVED! Status: {target_status}")
                print("Waking up Cursor (Claude) to execute task...")
                sys.exit(0)

            time.sleep(3)
        except Exception as e:
            print(f"Read error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 cursor_wait_for_status.py [Role] [Status] [optional: status_file_path]")
        sys.exit(1)

    if len(sys.argv) > 3:
        STATUS_FILE = sys.argv[3]

    wait_for_status(sys.argv[1], sys.argv[2])
